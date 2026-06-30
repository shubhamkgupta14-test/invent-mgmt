from datetime import datetime, UTC

from bson import ObjectId

from app.core.exceptions import bad_request, forbidden, not_found
from app.database.mongodb import db
from app.models.audit import AuditEvent, AuditModule
from app.models.auth import UserRole
from app.models.manufacturing import ManufacturingStatus
from app.services.audit_service import create_audit_log
from app.services.stock_service import increase_stock
from app.utils.helpers import (
    is_valid_object_id,
    normalize_sku,
    round_final_amount,
    round_price,
)
from app.utils.messages import Messages
from app.utils.pagination import paginate_collection, regex_filter, validate_sort_field
from app.utils.responseBuilder import build_manufacturing_response

manufacturing_collection = db.manufacturing
products_collection = db.products


async def create_manufacturing(auth_user: dict, manufacturing_data: dict):
    if auth_user.get("role") == UserRole.USER:
        forbidden()

    batch_no = (manufacturing_data.get("batch_no") or "").strip()
    sku = normalize_sku(manufacturing_data.get("sku"))

    if await manufacturing_collection.find_one({"batch_no": batch_no}):
        bad_request("Batch no already exists")

    product = await products_collection.find_one({"sku": sku})
    if not product:
        not_found(Messages.PRODUCT_NOT_FOUND)

    if not product.get("is_manufactured", False):
        bad_request("Only manufactured products can be added to manufacturing")

    if auth_user.get("role") == UserRole.ADMIN and not product.get("is_active"):
        forbidden(Messages.PRODUCT_INACTIVE)

    quantity = manufacturing_data.get("quantity")
    unit_cost = round_price(manufacturing_data.get("unit_cost"))
    other_charges = round_price(manufacturing_data.get("other_charges", 0))
    extra_cost_per_unit = round_price(
        other_charges / quantity
    )
    effective_unit_cost = round_price(unit_cost + extra_cost_per_unit)
    total_cost = round_final_amount(
        (quantity * unit_cost) + other_charges
    )

    document = {
        "batch_no": batch_no,
        "sku": sku,
        "name": product.get("name"),
        "quantity": quantity,
        "unit_cost": unit_cost,
        "other_charges": other_charges,
        "effective_unit_cost": effective_unit_cost,
        "total_cost": total_cost,
        "status": ManufacturingStatus.READY_TO_SELL.value,
        "notes": manufacturing_data.get("notes"),
        "created_by": auth_user.get("username"),
        "stock_updated": False,
        "created_at": datetime.now(UTC),
        "updated_at": datetime.now(UTC),
    }

    result = await manufacturing_collection.insert_one(document)

    await create_audit_log(
        module_name=AuditModule.MANUFACTURING,
        event_type=AuditEvent.CREATED,
        reference_id=batch_no,
        sku=sku,
        performed_by=auth_user.get("username"),
        new_data={
            "batch_no": batch_no,
            "sku": sku,
            "quantity": quantity,
            "status": ManufacturingStatus.READY_TO_SELL.value,
            "total_cost": total_cost,
        }
    )

    await increase_stock(
        sku=sku,
        name=product.get("name"),
        quantity=quantity,
        unit_price=effective_unit_cost,
        supplier_id=product.get("supplier_id"),
    )

    await manufacturing_collection.update_one(
        {"_id": result.inserted_id},
        {"$set": {"stock_updated": True, "updated_at": datetime.now(UTC)}}
    )

    created = await manufacturing_collection.find_one({"_id": result.inserted_id})
    return build_manufacturing_response(created)


async def get_manufacturing_records(
    auth_user: dict,
    manufacturing_id: str = None,
    batch_no: str = None,
    sku: str = None,
    search: str = None,
    sort_by: str = "created_at",
    order: str = "desc",
    page: int = 1,
    limit: int = 10
):
    if auth_user.get("role") not in [
        UserRole.SUPERADMIN,
        UserRole.ADMIN,
        UserRole.USER
    ]:
        forbidden()

    allowed_sort_fields = [
        "created_at",
        "updated_at",
        "batch_no",
        "sku",
        "name",
        "quantity",
        "status",
        "total_cost",
    ]
    validate_sort_field(sort_by, allowed_sort_fields)

    filters = {}

    if manufacturing_id:
        if not is_valid_object_id(manufacturing_id):
            bad_request("Invalid manufacturing id")
        filters["_id"] = ObjectId(manufacturing_id)

    if batch_no:
        filters["batch_no"] = batch_no

    if sku:
        filters["sku"] = normalize_sku(sku)

    filters.update(regex_filter(search, ["batch_no", "sku", "name", "status", "created_by"]))

    return await paginate_collection(
        manufacturing_collection,
        filters,
        sort_by,
        order,
        page,
        limit,
        build_manufacturing_response,
    )


async def get_manufacturing_by_id(auth_user: dict, manufacturing_id: str):
    if auth_user.get("role") not in [
        UserRole.SUPERADMIN,
        UserRole.ADMIN,
        UserRole.USER
    ]:
        forbidden()

    if not is_valid_object_id(manufacturing_id):
        bad_request("Invalid manufacturing id")

    record = await manufacturing_collection.find_one({
        "_id": ObjectId(manufacturing_id)
    })
    if not record:
        not_found("Manufacturing record not found")

    return build_manufacturing_response(record)
