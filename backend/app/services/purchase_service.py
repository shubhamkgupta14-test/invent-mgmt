from app.services.audit_service import (
    create_audit_log
)
from app.models.audit import (
    AuditEvent, AuditModule
)
from datetime import datetime, UTC
from bson import ObjectId
from fastapi import HTTPException, UploadFile
from pydantic import ValidationError
from app.database.mongodb import db

from app.models.auth import UserRole
from app.models.purchase import CreatePurchaseRequest
from app.models.purchase import PaymentStatus, PurchaseStatus
from app.services.stock_service import increase_stock

from app.core.exceptions import (
    forbidden,
    not_found,
    bad_request
)

from app.utils.messages import Messages
from app.utils.helpers import (
    is_valid_object_id,
    normalize_sku,
    round_price,
    round_final_amount
)
from app.utils.responseBuilder import build_purchase_response
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
purchase_collection = db.purchases
products_collection = db.products

PURCHASE_BULK_HEADERS = [
    "Invoice ID",
    "SKU",
    "Quantity",
    "Unit Price",
    "Discount %",
    "Additional Discount",
    "Shipping Charges",
    "Other Charges",
    "Payment Method",
    "Amount Paid",
    "Notes",
]
PURCHASE_BULK_HEADER_MAP = {
    "invoiceid": "invoice_id",
    "sku": "sku",
    "quantity": "quantity",
    "unitprice": "unit_price",
    "discount": "discount_percentage",
    "additionaldiscount": "additional_discount",
    "shippingcharges": "shipping_charges",
    "othercharges": "other_charges",
    "paymentmethod": "payment_method",
    "amountpaid": "amount_paid",
    "notes": "notes",
}


async def create_purchase(
    auth_user: dict,
    purchase_data: dict
):

    if auth_user.get("role") == UserRole.USER:
        forbidden()

    subtotal = 0
    total_tax = 0
    total_discount = 0
    total_quantity: int = 0

    purchase_items = []

    for item in purchase_data.get("items"):

        sku = normalize_sku(item.get("sku"))

        product = await products_collection.find_one({
            "sku": sku
        })

        if not product:
            not_found(Messages.PRODUCT_NOT_FOUND)

        if (
            auth_user.get("role") == UserRole.ADMIN
            and not product.get("is_active")
        ):
            forbidden(Messages.PRODUCT_INACTIVE)

        supplier_id = product.get("supplier_id")
        if not supplier_id:
            bad_request(Messages.INVALID_SUPPLIER_ID)

        supplier = await db.suppliers.find_one({
            "supplier_id": supplier_id
        })
        if not supplier:
            bad_request(Messages.INVALID_SUPPLIER_ID)

        quantity = item.get("quantity")
        unit_price = item.get("unit_price")

        tax_percentage = product.get("tax_rate", 0)

        discount_percentage = item.get(
            "discount_percentage",
            0
        )

        item_subtotal = round_price(
            quantity * unit_price
        )

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
        total_quantity += quantity

        purchase_items.append({
            "sku": sku,
            "barcode": str(item.get("barcode") or "").strip(),
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

    shipping_charges = round_price(purchase_data.get("shipping_charges", 0))
    other_charges = round_price(purchase_data.get("other_charges", 0))

    additional_discount = purchase_data.get("additional_discount", 0)

    additional_charge_per_unit = round_price((shipping_charges + other_charges -
                                              additional_discount - total_discount) / total_quantity)

    final_total_amount = round_final_amount(
        subtotal +
        total_tax -
        total_discount +
        # shipping_charges +
        # other_charges -
        additional_discount
    )

    total_paid = sum(
        payment.get("amount_paid", 0)
        for payment in purchase_data.get(
            "payment_details",
            []
        )
    )

    remaining_amount = (
        final_total_amount - total_paid
    )

    if remaining_amount <= 0:
        payment_status = PaymentStatus.PAID

    elif total_paid > 0:
        payment_status = PaymentStatus.PARTIAL

    else:
        payment_status = PaymentStatus.UNPAID

    # invoice_id = await generate_invoice_id()

    purchase_document = {
        "invoice_id": purchase_data.get("invoice_id"),
        "supplier_id": supplier_id,
        "items": purchase_items,
        "total_quantity": total_quantity,
        "subtotal": subtotal,
        "total_tax": total_tax,
        "additional_discount": additional_discount,
        "total_discount": total_discount + additional_discount,
        "final_total_amount": final_total_amount,
        "total_paid": total_paid,
        "remaining_amount": remaining_amount,
        "payment_status": payment_status,
        "payment_details": purchase_data.get(
            "payment_details",
            []
        ),
        "purchase_status": PurchaseStatus.COMPLETED,
        "notes": purchase_data.get("notes"),
        "shipping_charges": shipping_charges,
        "other_charges": other_charges,
        "additional_charge_per_unit": additional_charge_per_unit,
        "created_by": auth_user.get(
            "username"
        ),
        "stock_updated": False,
        "created_at": datetime.now(UTC),
        "updated_at": datetime.now(UTC)
    }

    result = await purchase_collection.insert_one(
        purchase_document
    )

    await create_audit_log(
        module_name=AuditModule.PURCHASE,
        event_type=AuditEvent.CREATED,
        reference_id=purchase_data.get(
            "invoice_id"
        ),
        performed_by=auth_user.get(
            "username"
        ),
        new_data={
            "invoice_id": purchase_data.get(
                "invoice_id"
            ),
            "supplier_id": supplier_id,
            "final_total_amount": final_total_amount,
            "total_items": len(
                purchase_items
            ),
            "payment_status": payment_status
        }
    )

    for item in purchase_items:
        await increase_stock(
            sku=item.get("sku"),
            name=item.get("name"),
            quantity=item.get("quantity"),
            unit_price=item.get("unit_price") + additional_charge_per_unit,
            supplier_id=supplier_id,
            barcode=item.get("barcode")
        )

    created_purchase = await purchase_collection.find_one({
        "_id": result.inserted_id
    })

    return build_purchase_response(
        created_purchase
    )


def _validation_reason(error):
    return "; ".join(
        f"{'.'.join(str(part) for part in item.get('loc', []))}: {item.get('msg')}"
        for item in error.errors()
    ) or "Invalid purchase data"


def _group_purchase_payments(rows: list[dict], header_indexes: dict[str, int]):
    payments_by_method = {}

    for grouped_row in rows:
        row = grouped_row["row"]
        payment_amount = parse_float(
            get_row_cell(row, header_indexes, "amount_paid"),
            "Amount Paid",
        )
        if payment_amount <= 0:
            continue

        payment_method = (
            clean_cell(get_row_cell(row, header_indexes, "payment_method")).upper()
            or "CASH"
        )
        payments_by_method[payment_method] = round_price(
            payments_by_method.get(payment_method, 0) + payment_amount
        )

    return [
        {
            "payment_method": payment_method,
            "amount_paid": amount_paid,
        }
        for payment_method, amount_paid in payments_by_method.items()
    ]


async def bulk_upload_purchases(file: UploadFile, auth_user: dict):
    if auth_user.get("role") == UserRole.USER:
        forbidden()

    header_indexes, data_rows = await read_bulk_excel(
        file,
        PURCHASE_BULK_HEADERS,
        PURCHASE_BULK_HEADER_MAP,
    )
    row_results = []
    grouped_rows = {}
    group_order = []

    for row_number, row in data_rows:
        row_data = build_row_data(PURCHASE_BULK_HEADERS, PURCHASE_BULK_HEADER_MAP, header_indexes, row)

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

            payload = CreatePurchaseRequest(
                invoice_id=group["invoice_id"],
                items=items,
                additional_discount=parse_float(first_cell("additional_discount"), "Additional Discount"),
                shipping_charges=parse_float(first_cell("shipping_charges"), "Shipping Charges"),
                other_charges=parse_float(first_cell("other_charges"), "Other Charges"),
                payment_details=_group_purchase_payments(group["rows"], header_indexes),
                notes=clean_cell(first_cell("notes")) or None,
            ).model_dump()
            created_purchase = await create_purchase(auth_user, payload)
            for grouped_row in group["rows"]:
                row_results.append({
                    "row_number": grouped_row["row_number"],
                    "status": "created",
                    "reason": "",
                    "data": grouped_row["data"],
                    "record": created_purchase,
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

    return summarize_bulk_rows(PURCHASE_BULK_HEADERS, row_results)


async def get_purchases(
    auth_user: dict,
    purchase_id: str = None,
    invoice_id: str = None,
    supplier_id: str = None,
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
        "supplier_id",
        "total_quantity",
        "final_total_amount",
        "payment_status",
        "purchase_status",
    ]

    if purchase_id:
        if not is_valid_object_id(purchase_id):
            bad_request(Messages.INVALID_PURCHASE_ID)

        filters["_id"] = ObjectId(purchase_id)

    if invoice_id:
        filters["invoice_id"] = invoice_id

    if supplier_id:
        filters["supplier_id"] = supplier_id

    validate_sort_field(sort_by, allowed_sort_fields)
    filters.update(regex_filter(search, [
        "invoice_id",
        "supplier_id",
        "payment_status",
        "purchase_status",
        "created_by",
        "items.sku",
        "items.name",
    ]))

    return await paginate_collection(
        purchase_collection,
        filters,
        sort_by,
        order,
        page,
        limit,
        build_purchase_response,
    )


async def get_purchase_by_purchase_id(
    auth_user: dict,
    purchase_id: str
):
    if auth_user.get("role") not in [
        UserRole.SUPERADMIN,
        UserRole.ADMIN,
        UserRole.USER
    ]:
        forbidden()

    if not is_valid_object_id(purchase_id):
        bad_request(Messages.INVALID_PURCHASE_ID)

    purchase = await purchase_collection.find_one({
        "_id": ObjectId(purchase_id)
    })

    if not purchase:
        not_found(Messages.PURCHASE_NOT_FOUND)

    return build_purchase_response(purchase)
