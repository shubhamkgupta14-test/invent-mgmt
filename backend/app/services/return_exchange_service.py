from datetime import datetime, UTC
from bson import ObjectId

from app.core.exceptions import bad_request, forbidden, not_found
from app.database.mongodb import db
from app.models.audit import AuditEvent, AuditModule
from app.models.auth import UserRole
from app.services.audit_service import create_audit_log
from app.services.stock_service import (
    decrease_stock,
    increase_stock,
    record_unsellable_stock,
)
from app.utils.helpers import is_valid_object_id, normalize_sku, round_final_amount
from app.utils.messages import Messages
from app.utils.responseBuilder import build_exchange_response, build_return_response

returns_collection = db.returns
exchanges_collection = db.exchanges
products_collection = db.products
stocks_collection = db.stocks
sales_collection = db.sales

RESELLABLE = "RESELLABLE"
DAMAGED = "DAMAGED"
LOST = "LOST"


def _can_view(auth_user: dict):
    if auth_user.get("role") not in [UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.USER]:
        forbidden()


def _can_mutate(auth_user: dict):
    if auth_user.get("role") == UserRole.USER:
        forbidden(Messages.ACCESS_DENIED)
    if auth_user.get("role") not in [UserRole.SUPERADMIN, UserRole.ADMIN]:
        forbidden()


async def _prepare_item(item: dict, auth_user: dict):
    sku = normalize_sku(item.get("sku"))
    product = await products_collection.find_one({"sku": sku})

    if not product:
        not_found(Messages.PRODUCT_NOT_FOUND)

    if auth_user.get("role") == UserRole.ADMIN and not product.get("is_active"):
        forbidden(Messages.PRODUCT_INACTIVE)

    stock = await stocks_collection.find_one({"sku": sku})
    unit_price = item.get("unit_price")
    if unit_price is None:
        unit_price = stock.get("avg_price", 0) if stock else 0

    quantity = item.get("quantity")

    item_status = item.get("item_status") or RESELLABLE
    if item_status not in [RESELLABLE, DAMAGED, LOST]:
        bad_request(Messages.INVALID_ITEM_STATUS)

    return {
        "sku": sku,
        "name": product.get("name"),
        "supplier_id": product.get("supplier_id"),
        "quantity": quantity,
        "unit_price": unit_price,
        "total_price": round_final_amount(quantity * unit_price),
        "item_status": item_status,
        "reason": item.get("reason"),
    }


def _build_sale_filter(sale_id: str = None, invoice_id: str = None):
    if sale_id:
        if not is_valid_object_id(sale_id):
            bad_request(Messages.INVALID_SALE_ID)
        return {"_id": ObjectId(sale_id)}

    if invoice_id:
        return {"invoice_id": invoice_id}

    return None


async def _update_sale_status(sale_id: str, invoice_id: str, status: str):
    sale_filter = _build_sale_filter(sale_id=sale_id, invoice_id=invoice_id)
    if not sale_filter:
        return

    result = await sales_collection.update_one(
        sale_filter,
        {"$set": {
            "sale_status": status,
            "updated_at": datetime.now(UTC)
        }}
    )

    if result.matched_count == 0:
        not_found(Messages.SALE_NOT_FOUND)


async def _record_returned_item_stock(item: dict):
    if item.get("item_status") == RESELLABLE:
        await increase_stock(
            sku=item.get("sku"),
            name=item.get("name"),
            quantity=item.get("quantity"),
            unit_price=item.get("unit_price"),
            supplier_id=item.get("supplier_id"),
        )
        return

    await record_unsellable_stock(
        sku=item.get("sku"),
        name=item.get("name"),
        quantity=item.get("quantity"),
        unit_price=item.get("unit_price"),
        item_status=item.get("item_status"),
        supplier_id=item.get("supplier_id"),
    )


async def create_return(auth_user: dict, return_data: dict):
    _can_mutate(auth_user)

    items = [
        await _prepare_item(item, auth_user)
        for item in return_data.get("items", [])
    ]

    total_quantity = sum(item.get("quantity", 0) for item in items)
    total_amount = round_final_amount(
        sum(item.get("total_price", 0) for item in items)
    )

    document = {
        "sale_id": return_data.get("sale_id"),
        "invoice_id": return_data.get("invoice_id"),
        "items": items,
        "total_quantity": total_quantity,
        "total_amount": total_amount,
        "refund_amount": round_final_amount(return_data.get("refund_amount", 0)),
        "notes": return_data.get("notes"),
        "created_by": auth_user.get("username"),
        "created_at": datetime.now(UTC),
        "updated_at": datetime.now(UTC),
    }

    result = await returns_collection.insert_one(document)

    for item in items:
        await _record_returned_item_stock(item)

    await _update_sale_status(
        sale_id=return_data.get("sale_id"),
        invoice_id=return_data.get("invoice_id"),
        status="RETURN",
    )

    await create_audit_log(
        module_name=AuditModule.RETURN,
        event_type=AuditEvent.CREATED,
        reference_id=return_data.get("invoice_id") or return_data.get("sale_id"),
        performed_by=auth_user.get("username"),
        new_data={
            "total_quantity": total_quantity,
            "total_amount": total_amount,
            "refund_amount": document.get("refund_amount"),
        },
    )

    created_return = await returns_collection.find_one({"_id": result.inserted_id})
    return build_return_response(created_return)


async def create_exchange(auth_user: dict, exchange_data: dict):
    _can_mutate(auth_user)

    returned_items = [
        await _prepare_item(item, auth_user)
        for item in exchange_data.get("returned_items", [])
    ]
    replacement_items = [
        await _prepare_item(item, auth_user)
        for item in exchange_data.get("replacement_items", [])
    ]

    returned_quantity_by_sku = {}
    for item in returned_items:
        if item.get("item_status") == RESELLABLE:
            returned_quantity_by_sku[item.get("sku")] = (
                returned_quantity_by_sku.get(item.get("sku"), 0) +
                item.get("quantity", 0)
            )

    for item in replacement_items:
        stock = await stocks_collection.find_one({"sku": item.get("sku")})
        available_quantity = (stock.get("quantity", 0) if stock else 0) + returned_quantity_by_sku.get(item.get("sku"), 0)
        if available_quantity < item.get("quantity", 0):
            bad_request(Messages.INSUFFICIENT_STOCK)

    returned_amount = round_final_amount(
        sum(item.get("total_price", 0) for item in returned_items)
    )
    replacement_amount = round_final_amount(
        sum(item.get("total_price", 0) for item in replacement_items)
    )

    document = {
        "sale_id": exchange_data.get("sale_id"),
        "invoice_id": exchange_data.get("invoice_id"),
        "returned_items": returned_items,
        "replacement_items": replacement_items,
        "returned_quantity": sum(item.get("quantity", 0) for item in returned_items),
        "replacement_quantity": sum(item.get("quantity", 0) for item in replacement_items),
        "returned_amount": returned_amount,
        "replacement_amount": replacement_amount,
        "adjustment_amount": round_final_amount(exchange_data.get("adjustment_amount", 0)),
        "notes": exchange_data.get("notes"),
        "created_by": auth_user.get("username"),
        "created_at": datetime.now(UTC),
        "updated_at": datetime.now(UTC),
    }

    result = await exchanges_collection.insert_one(document)

    for item in returned_items:
        await _record_returned_item_stock(item)

    for item in replacement_items:
        ok = await decrease_stock(
            sku=item.get("sku"),
            quantity=item.get("quantity"),
        )
        if not ok:
            bad_request(Messages.INSUFFICIENT_STOCK)

    await _update_sale_status(
        sale_id=exchange_data.get("sale_id"),
        invoice_id=exchange_data.get("invoice_id"),
        status="EXCHANGE",
    )

    await create_audit_log(
        module_name=AuditModule.EXCHANGE,
        event_type=AuditEvent.CREATED,
        reference_id=exchange_data.get("invoice_id") or exchange_data.get("sale_id"),
        performed_by=auth_user.get("username"),
        new_data={
            "returned_quantity": document.get("returned_quantity"),
            "replacement_quantity": document.get("replacement_quantity"),
            "adjustment_amount": document.get("adjustment_amount"),
        },
    )

    created_exchange = await exchanges_collection.find_one({"_id": result.inserted_id})
    return build_exchange_response(created_exchange)


async def get_returns(auth_user: dict, return_id: str = None):
    _can_view(auth_user)

    filters = {}
    if return_id:
        if not is_valid_object_id(return_id):
            bad_request(Messages.INVALID_RETURN_ID)
        filters["_id"] = ObjectId(return_id)

    returns = []
    async for item in returns_collection.find(filters).sort("created_at", -1):
        returns.append(build_return_response(item))

    return returns


async def get_exchanges(auth_user: dict, exchange_id: str = None):
    _can_view(auth_user)

    filters = {}
    if exchange_id:
        if not is_valid_object_id(exchange_id):
            bad_request(Messages.INVALID_EXCHANGE_ID)
        filters["_id"] = ObjectId(exchange_id)

    exchanges = []
    async for item in exchanges_collection.find(filters).sort("created_at", -1):
        exchanges.append(build_exchange_response(item))

    return exchanges
