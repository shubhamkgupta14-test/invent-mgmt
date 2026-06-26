from datetime import datetime, UTC
from app.database.mongodb import db
from app.utils.helpers import generate_supplier_id
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


async def get_all_suppliers(auth_user: dict):
    suppliers = []

    if auth_user.get("role") == UserRole.SUPERADMIN:
        async for supplier in suppliers_collection.find().sort("created_at", -1):
            suppliers.append(build_supplier_response(supplier))
        return suppliers

    if auth_user.get("role") in [UserRole.ADMIN, UserRole.USER]:
        async for supplier in suppliers_collection.find({"is_active": True}).sort("created_at", -1):
            suppliers.append(build_supplier_response(supplier))
        return suppliers

    forbidden()


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
