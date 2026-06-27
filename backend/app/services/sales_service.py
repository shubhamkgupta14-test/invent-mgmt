from datetime import datetime, UTC
from bson import ObjectId

from app.database.mongodb import db
from app.models.auth import UserRole
from app.utils.messages import Messages
from app.services.stock_service import decrease_stock
from app.utils.helpers import (
    is_valid_object_id,
    normalize_sku,
    round_final_amount,
    round_price)
from app.utils.responseBuilder import build_sales_response
from app.core.exceptions import (
    forbidden,
    not_found,
    bad_request)
from app.services.audit_service import (
    create_audit_log
)
from app.models.audit import (
    AuditEvent, AuditModule
)

sales_collection = db.sales
products_collection = db.products
stocks_collection = db.stocks


async def create_sale(auth_user: dict, sale_data: dict):

    if auth_user.get("role") == UserRole.USER:
        forbidden(Messages.ACCESS_DENIED)

    subtotal = 0
    total_tax = 0
    total_discount = 0

    sale_items = []

    for item in sale_data["items"]:

        sku = normalize_sku(item["sku"])

        product = await products_collection.find_one({"sku": sku})

        if not product:
            not_found(Messages.PRODUCT_NOT_FOUND)

        if not product.get("is_active"):
            forbidden(Messages.PRODUCT_INACTIVE)

        supplier_id = product.get("supplier_id")
        if not supplier_id:
            bad_request(Messages.INVALID_SUPPLIER_ID)

        supplier = await db.suppliers.find_one({"supplier_id": supplier_id})
        if not supplier:
            bad_request(Messages.INVALID_SUPPLIER_ID)

        item["name"] = product.get("name")

        quantity = item.get("quantity")
        unit_price = item.get("unit_price")

        tax_percentage = product.get("tax_rate", 0)

        discount_percentage = item.get(
            "discount_percentage",
            0
        )

        item_subtotal = round_price(quantity * unit_price)

        tax_amount = round_price(
            (item_subtotal * tax_percentage) / 100
        )

        discount_amount = round_price(
            (item_subtotal * discount_percentage) / 100
        )

        total_price = round_price(
            item_subtotal +
            tax_amount -
            discount_amount
        )

        subtotal += round_price(item_subtotal)
        total_tax += round_price(tax_amount)
        total_discount += round_price(discount_amount)

        sale_items.append({
            "sku": sku,
            "name": product.get("name"),
            "quantity": quantity,
            "unit_price": unit_price,
            "subtotal": item_subtotal,
            "tax_percentage": tax_percentage,
            "tax_amount": tax_amount,
            "discount_percentage": discount_percentage,
            "discount_amount": discount_amount,
            "total_price": total_price
        })

    final_total_amount = round_final_amount(
        subtotal +
        total_tax -
        total_discount
    )

    sale_document = {
        "invoice_id": sale_data.get("invoice_id"),
        "user_info": sale_data.get("user_info"),
        "items": sale_items,
        "subtotal": subtotal,
        "total_tax": total_tax,
        "total_discount": total_discount,
        "final_total_amount": final_total_amount,
        "payment_details": sale_data.get(
            "payment_details",
            []
        ),
        "sale_status": "SOLD",
        "notes": sale_data.get("notes"),
        "created_by": auth_user.get(
            "username"
        ),
        "stock_updated": False,
        "created_at": datetime.now(UTC),
        "updated_at": datetime.now(UTC)
    }

    for item in sale_items:
        stock = await stocks_collection.find_one({
            "sku": item.get("sku")
        })

        if not stock:
            bad_request(Messages.INSUFFICIENT_STOCK)

        if stock.get("quantity", 0) < item.get("quantity"):
            bad_request(Messages.INSUFFICIENT_STOCK)

    result = await sales_collection.insert_one(sale_document)

    await create_audit_log(
        module_name=AuditModule.SALES,
        event_type=AuditEvent.CREATED,
        reference_id=sale_data.get(
            "invoice_id"
        ),
        performed_by=auth_user.get(
            "username"
        ),
        new_data={
            "invoice_id": sale_data.get(
                "invoice_id"
            ),
            "final_total_amount": final_total_amount,
            "total_items": len(
                sale_items
            )
        }
    )

    for item in sale_items:
        await decrease_stock(
            sku=item.get("sku"),
            quantity=item.get("quantity"),
        )

    created_sale = await sales_collection.find_one({"_id": result.inserted_id})

    return build_sales_response(created_sale)


async def get_sales(
    auth_user: dict,
    sale_id: str = None,
    invoice_id: str = None,
    sort_by: str = "created_at",
    order: str = "desc"
):
    if auth_user.get("role") not in [
        UserRole.SUPERADMIN,
        UserRole.ADMIN,
        UserRole.USER
    ]:
        forbidden()

    filters = {}
    sales = []
    allowed_sort_fields = [
        "created_at",
        "updated_at",
        "invoice_id",
    ]

    if sale_id:
        if not is_valid_object_id(sale_id):
            bad_request(Messages.INVALID_SALE_ID)

        filters["_id"] = ObjectId(sale_id)

    if invoice_id:
        filters["invoice_id"] = invoice_id

    if sort_by not in allowed_sort_fields:
        bad_request(Messages.INVALID_SORT_FIELD)

    if order.lower() not in ["asc", "desc"]:
        bad_request(Messages.INVALID_SORT_FIELD)

    sort_order = -1 if order.lower() == "desc" else 1

    async for sale in sales_collection.find(filters).sort(sort_by, sort_order):

        sales.append(
            build_sales_response(sale)
        )

    return sales
