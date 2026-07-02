from datetime import datetime, UTC
from app.database.mongodb import db
from fastapi import HTTPException, UploadFile
from pydantic import ValidationError
from app.models.supplier import SupplierCreate
from app.utils.bulk_upload import (
    build_row_data,
    clean_cell,
    get_row_cell,
    normalize_header,
    read_bulk_excel,
    summarize_bulk_rows,
)
from app.utils.helpers import generate_supplier_id
from app.utils.pagination import paginate_collection, regex_filter, validate_sort_field
from app.utils.responseBuilder import build_supplier_response
from app.models.auth import UserRole
from app.utils.messages import Messages
from app.core.exceptions import (
    forbidden,
    not_found,
    bad_request,
    conflict
)

suppliers_collection = db.suppliers
OWN_COMPANY_SUPPLIER_KEY = "own-company"

SUPPLIER_BULK_HEADERS = [
    "Name",
    "Contact Person",
    "Email",
    "Phone",
    "Address",
    "GST Number",
]
SUPPLIER_BULK_HEADER_MAP = {
    "name": "name",
    "contactperson": "contact_person",
    "email": "email",
    "phone": "phone",
    "address": "address",
    "gstnumber": "gst_number",
}


def clean_optional_supplier_fields(supplier_data: dict):
    for field in ["email", "phone", "gst_number", "address"]:
        if supplier_data.get(field) == "":
            supplier_data[field] = None


async def add_supplier(supplier_data: dict, auth_user: dict):
    if auth_user.get("role") == UserRole.USER:
        forbidden()

    clean_optional_supplier_fields(supplier_data)

    # existing_supplier = await suppliers_collection.find_one({
    #     "name": supplier_data.get("name")
    # })

    # if existing_supplier:
    #     conflict(Messages.SUPPLIER_ALREADY_EXISTS)

    supplier_data["supplier_id"] = await generate_supplier_id(db)
    supplier_data["created_at"] = datetime.now(UTC)
    supplier_data["updated_at"] = datetime.now(UTC)
    supplier_data["is_active"] = True

    result = await suppliers_collection.insert_one(supplier_data)
    created_supplier = await suppliers_collection.find_one({
        "_id": result.inserted_id
    })

    return build_supplier_response(created_supplier)


async def get_own_company_supplier():
    return await suppliers_collection.find_one({
        "system_key": OWN_COMPANY_SUPPLIER_KEY,
        "is_own_company": True,
    })


async def ensure_own_company_supplier(company_data: dict | None = None, user_data: dict | None = None):
    company_data = company_data or {}
    user_data = user_data or {}
    now = datetime.now(UTC)

    name = (
        company_data.get("company_name")
        or company_data.get("brand_name")
        or "Own Company"
    ).strip()
    contact_person = " ".join(
        part for part in [
            (user_data.get("firstname") or "").strip(),
            (user_data.get("lastname") or "").strip(),
        ]
        if part
    ) or user_data.get("username") or "Owner"

    supplier_data = {
        "name": name,
        "contact_person": contact_person,
        "email": company_data.get("email") or user_data.get("email"),
        "phone": company_data.get("phone"),
        "address": company_data.get("address"),
        "gst_number": company_data.get("gst_number"),
        "is_active": True,
        "is_own_company": True,
        "system_key": OWN_COMPANY_SUPPLIER_KEY,
        "updated_at": now,
    }
    clean_optional_supplier_fields(supplier_data)

    existing = await get_own_company_supplier()
    if existing:
        await suppliers_collection.update_one(
            {"_id": existing["_id"]},
            {"$set": supplier_data},
        )
        return await suppliers_collection.find_one({"_id": existing["_id"]})

    supplier_data["supplier_id"] = await generate_supplier_id(db)
    supplier_data["created_at"] = now
    result = await suppliers_collection.insert_one(supplier_data)
    return await suppliers_collection.find_one({"_id": result.inserted_id})


def _validation_reason(error):
    return "; ".join(
        f"{'.'.join(str(part) for part in item.get('loc', []))}: {item.get('msg')}"
        for item in error.errors()
    ) or "Invalid supplier data"


async def bulk_upload_suppliers(file: UploadFile, auth_user: dict):
    if auth_user.get("role") == UserRole.USER:
        forbidden()

    header_indexes, data_rows = await read_bulk_excel(
        file,
        SUPPLIER_BULK_HEADERS,
        SUPPLIER_BULK_HEADER_MAP,
    )
    row_results = []

    for row_number, row in data_rows:
        row_data = build_row_data(SUPPLIER_BULK_HEADERS, SUPPLIER_BULK_HEADER_MAP, header_indexes, row)

        def cell(field):
            return clean_cell(get_row_cell(row, header_indexes, field))

        try:
            payload = SupplierCreate(
                name=cell("name"),
                contact_person=cell("contact_person"),
                email=cell("email") or None,
                phone=cell("phone") or None,
                address=cell("address") or None,
                gst_number=cell("gst_number") or None,
            ).model_dump()
            created_supplier = await add_supplier(payload, auth_user)
            row_results.append({
                "row_number": row_number,
                "status": "created",
                "reason": "",
                "data": row_data,
                "record": created_supplier,
            })
        except ValidationError as error:
            row_results.append({
                "row_number": row_number,
                "status": "failed",
                "reason": _validation_reason(error),
                "data": row_data,
            })
        except HTTPException as error:
            row_results.append({
                "row_number": row_number,
                "status": "failed",
                "reason": str(error.detail),
                "data": row_data,
            })

    return summarize_bulk_rows(SUPPLIER_BULK_HEADERS, row_results)


async def get_all_suppliers(
    auth_user: dict,
    search: str = None,
    sort_by: str = "created_at",
    order: str = "desc",
    page: int = 1,
    limit: int = 10,
):
    allowed_sort_fields = [
        "created_at",
        "updated_at",
        "supplier_id",
        "name",
        "email",
        "phone",
        "contact_person",
        "is_active",
    ]
    validate_sort_field(sort_by, allowed_sort_fields)

    if auth_user.get("role") == UserRole.SUPERADMIN:
        filters = {}
    elif auth_user.get("role") in [UserRole.ADMIN, UserRole.USER]:
        filters = {"is_active": True}
    else:
        forbidden()

    filters.update(regex_filter(search, [
        "supplier_id",
        "name",
        "email",
        "phone",
        "address",
        "gst_number",
        "contact_person",
    ]))

    return await paginate_collection(
        suppliers_collection,
        filters,
        sort_by,
        order,
        page,
        limit,
        build_supplier_response,
    )


async def get_supplier_by_id(supplier_id: str, auth_user: dict):
    if not supplier_id:
        bad_request(Messages.SUPPLIER_NOT_FOUND)

    supplier = await suppliers_collection.find_one({
        "supplier_id": supplier_id
    })

    if not supplier:
        not_found(Messages.SUPPLIER_NOT_FOUND)

    if auth_user.get("role") == UserRole.SUPERADMIN:
        return build_supplier_response(supplier)

    if auth_user.get("role") in [UserRole.ADMIN, UserRole.USER]:
        if not supplier.get("is_active"):
            forbidden()
        return build_supplier_response(supplier)

    forbidden()


async def update_supplier_by_id(supplier_id: str, update_data: dict, auth_user: dict):
    if auth_user.get("role") == UserRole.USER:
        forbidden()

    if not supplier_id:
        bad_request(Messages.SUPPLIER_NOT_FOUND)

    existing_supplier = await suppliers_collection.find_one({
        "supplier_id": supplier_id
    })

    if not existing_supplier:
        not_found(Messages.SUPPLIER_NOT_FOUND)

    if auth_user.get("role") == UserRole.ADMIN and not existing_supplier.get("is_active"):
        forbidden()

    clean_optional_supplier_fields(update_data)

    update_data["updated_at"] = datetime.now(UTC)

    await suppliers_collection.update_one(
        {"supplier_id": supplier_id},
        {"$set": update_data}
    )

    updated_supplier = await suppliers_collection.find_one({
        "supplier_id": supplier_id
    })

    return build_supplier_response(updated_supplier)
