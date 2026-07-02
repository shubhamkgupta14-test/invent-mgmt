from datetime import datetime, UTC
from bson import ObjectId
from fastapi import HTTPException, UploadFile
from pydantic import ValidationError

from app.database.mongodb import db
from app.models.auth import UserRole
from app.models.sale import SaleCreate
from app.utils.messages import Messages
from app.services.stock_service import decrease_stock
from app.utils.helpers import (
    is_valid_object_id,
    normalize_sku,
    round_final_amount,
    round_price)
from app.utils.responseBuilder import build_sales_response
from app.utils.pagination import paginate_collection, regex_filter, validate_sort_field
from app.utils.bulk_upload import (
    build_row_data,
    clean_cell,
    get_row_cell,
    parse_float,
    parse_int,
    read_bulk_excel,
    summarize_bulk_rows,
)
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

SALE_BULK_HEADERS = [
    "Invoice ID",
    "Platform",
    "Customer Name",
    "Customer Phone",
    "Customer Email",
    "SKU",
    "Quantity",
    "Unit Price",
    "Discount %",
    "Payment Method",
    "Amount Paid",
    "Payment Status",
    "Notes",
]
SALE_BULK_HEADER_MAP = {
    "invoiceid": "invoice_id",
    "platform": "platform",
    "customername": "customer_name",
    "customerphone": "customer_phone",
    "customeremail": "customer_email",
    "sku": "sku",
    "quantity": "quantity",
    "unitprice": "unit_price",
    "discount": "discount_percentage",
    "paymentmethod": "payment_method",
    "amountpaid": "amount_paid",
    "paymentstatus": "payment_status",
    "notes": "notes",
}


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

        discount_amount = round_price(
            (item_subtotal * discount_percentage) / 100
        )

        taxable_amount = round_price(
            item_subtotal - discount_amount
        )

        tax_amount = round_price(
            (taxable_amount * tax_percentage) / 100
        )

        total_price = round_price(
            taxable_amount +
            tax_amount
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

    total_paid = sum(
        payment.get("amount_paid", 0)
        for payment in sale_data.get(
            "payment_details",
            []
        )
    )

    sale_document = {
        "invoice_id": sale_data.get("invoice_id"),
        "platform": sale_data.get("platform", "Self Store"),
        "user_info": sale_data.get("user_info"),
        "items": sale_items,
        "subtotal": subtotal,
        "total_tax": total_tax,
        "total_discount": total_discount,
        "final_total_amount": final_total_amount,
        "total_paid": total_paid,
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

    required_quantity_by_sku = {}
    for item in sale_items:
        required_quantity_by_sku[item.get("sku")] = (
            required_quantity_by_sku.get(item.get("sku"), 0)
            + item.get("quantity", 0)
        )

    for sku, required_quantity in required_quantity_by_sku.items():
        stock = await stocks_collection.find_one({
            "sku": sku
        })

        if not stock:
            bad_request(Messages.INSUFFICIENT_STOCK)

        if stock.get("quantity", 0) < required_quantity:
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
            "platform": sale_data.get("platform", "Self Store"),
            "final_total_amount": final_total_amount,
            "total_items": len(
                sale_items
            )
        }
    )

    for item in sale_items:
        stock_decreased = await decrease_stock(
            sku=item.get("sku"),
            quantity=item.get("quantity"),
        )
        if not stock_decreased:
            bad_request(Messages.INSUFFICIENT_STOCK)

    created_sale = await sales_collection.find_one({"_id": result.inserted_id})

    return build_sales_response(created_sale)


def _validation_reason(error):
    return "; ".join(
        f"{'.'.join(str(part) for part in item.get('loc', []))}: {item.get('msg')}"
        for item in error.errors()
    ) or "Invalid sale data"


def _group_sale_payments(rows: list[dict], header_indexes: dict[str, int]):
    payments_by_key = {}

    for grouped_row in rows:
        row = grouped_row["row"]
        payment_amount = parse_float(
            get_row_cell(row, header_indexes, "amount_paid"),
            "Amount Paid",
        )
        if payment_amount <= 0:
            continue

        payment_method = clean_cell(
            get_row_cell(row, header_indexes, "payment_method")
        ) or "CASH"
        payment_status = clean_cell(
            get_row_cell(row, header_indexes, "payment_status")
        ).upper() or "PAID"
        key = (payment_method, payment_status)
        payments_by_key[key] = round_price(
            payments_by_key.get(key, 0) + payment_amount
        )

    return [
        {
            "payment_method": payment_method,
            "amount_paid": amount_paid,
            "payment_status": payment_status,
        }
        for (payment_method, payment_status), amount_paid in payments_by_key.items()
    ]


async def bulk_upload_sales(file: UploadFile, auth_user: dict):
    if auth_user.get("role") == UserRole.USER:
        forbidden(Messages.ACCESS_DENIED)

    header_indexes, data_rows = await read_bulk_excel(
        file,
        SALE_BULK_HEADERS,
        SALE_BULK_HEADER_MAP,
    )
    row_results = []
    grouped_rows = {}
    group_order = []

    for row_number, row in data_rows:
        row_data = build_row_data(SALE_BULK_HEADERS, SALE_BULK_HEADER_MAP, header_indexes, row)

        def cell(field):
            return get_row_cell(row, header_indexes, field)

        invoice_id = clean_cell(cell("invoice_id"))
        group_key = invoice_id or f"__row_{row_number}"
        if group_key not in grouped_rows:
            grouped_rows[group_key] = {
                "invoice_id": invoice_id,
                "rows": [],
            }
            group_order.append(group_key)

        grouped_rows[group_key]["rows"].append({
            "row_number": row_number,
            "row": row,
            "data": row_data,
        })

    for group_key in group_order:
        group = grouped_rows[group_key]
        first = group["rows"][0]

        def first_cell(field):
            return get_row_cell(first["row"], header_indexes, field)

        try:
            customer = {
                "name": clean_cell(first_cell("customer_name")),
                "phone": clean_cell(first_cell("customer_phone")),
                "email": clean_cell(first_cell("customer_email")),
            }
            items = []
            for grouped_row in group["rows"]:
                row = grouped_row["row"]

                def item_cell(field):
                    return get_row_cell(row, header_indexes, field)

                items.append({
                    "sku": clean_cell(item_cell("sku")),
                    "quantity": parse_int(item_cell("quantity"), "Quantity"),
                    "unit_price": parse_float(item_cell("unit_price"), "Unit Price"),
                    "discount_percentage": parse_float(item_cell("discount_percentage"), "Discount %"),
                })

            payload = SaleCreate(
                invoice_id=group["invoice_id"],
                platform=clean_cell(first_cell("platform")) or "Self Store",
                user_info=customer if any(customer.values()) else None,
                items=items,
                payment_details=_group_sale_payments(group["rows"], header_indexes),
                notes=clean_cell(first_cell("notes")) or None,
            ).model_dump()
            created_sale = await create_sale(auth_user, payload)
            for grouped_row in group["rows"]:
                row_results.append({
                    "row_number": grouped_row["row_number"],
                    "status": "created",
                    "reason": "",
                    "data": grouped_row["data"],
                    "record": created_sale,
                })
        except ValidationError as error:
            reason = _validation_reason(error)
            for grouped_row in group["rows"]:
                row_results.append({
                    "row_number": grouped_row["row_number"],
                    "status": "failed",
                    "reason": reason,
                    "data": grouped_row["data"],
                })
        except (HTTPException, ValueError) as error:
            reason = str(getattr(error, "detail", error))
            for grouped_row in group["rows"]:
                row_results.append({
                    "row_number": grouped_row["row_number"],
                    "status": "failed",
                    "reason": reason,
                    "data": grouped_row["data"],
                })

    return summarize_bulk_rows(SALE_BULK_HEADERS, row_results)


async def get_sales(
    auth_user: dict,
    sale_id: str = None,
    invoice_id: str = None,
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

    filters = {}
    allowed_sort_fields = [
        "created_at",
        "updated_at",
        "invoice_id",
        "platform",
        "final_total_amount",
        "total_paid",
        "sale_status",
    ]

    if sale_id:
        if not is_valid_object_id(sale_id):
            bad_request(Messages.INVALID_SALE_ID)

        filters["_id"] = ObjectId(sale_id)

    if invoice_id:
        filters["invoice_id"] = invoice_id

    validate_sort_field(sort_by, allowed_sort_fields)
    search_filter = regex_filter(search, [
        "invoice_id",
        "platform",
        "sale_status",
        "created_by",
        "items.sku",
        "items.name",
    ])

    normalized_search = (search or "").lower().replace(" ", "").replace("_", "").replace("-", "")
    if (
        len(normalized_search) >= 2
        and (
            "selfstore".startswith(normalized_search)
            or "store".startswith(normalized_search)
        )
    ):
        search_filter.setdefault("$or", []).append({"platform": {"$in": [None, ""]}})

    filters.update(search_filter)

    return await paginate_collection(
        sales_collection,
        filters,
        sort_by,
        order,
        page,
        limit,
        build_sales_response,
    )
