from datetime import datetime, UTC
import re
import string

from bson import ObjectId
from pymongo.errors import DuplicateKeyError

from app.core.exceptions import bad_request, forbidden, not_found
from app.database.mongodb import db
from app.models.auth import UserRole
from app.models.audit import AuditEvent, AuditModule
from app.services.audit_service import create_audit_log
from app.services.company_service import DEFAULT_COMPANY_SETTINGS, SETTINGS_KEY
from app.services.stock_service import decrease_stock
from app.utils.helpers import (
    is_valid_object_id,
    normalize_sku,
    round_final_amount,
    round_price,
)
from app.utils.pagination import paginate_collection, regex_filter, validate_sort_field
from app.utils.responseBuilder import build_invoice_response
from app.utils.settings import Settings

invoices_collection = db.invoices
sales_collection = db.sales
products_collection = db.products
stocks_collection = db.stocks
company_settings_collection = db.company_settings

OFFLINE_DISCOUNT_PERCENTAGE = 20
INVOICE_SEQUENCE_LIMIT = 26 * 9999
INVOICE_NUMBER_PATTERN = re.compile(
    r"^INV-\d{6}-[A-Z]\d{4}$"
)
INVOICE_SEQUENCE_PATTERN = re.compile(r"([A-Z])(\d{4})$")


def _clean_text(value):
    return (value or "").strip()


async def _company_snapshot():
    settings = await company_settings_collection.find_one({"settings_key": SETTINGS_KEY})
    data = {**DEFAULT_COMPANY_SETTINGS, **(settings or {})}
    return {
        "company_name": data.get("company_name") or data.get("brand_name") or "",
        "brand_name": data.get("brand_name", ""),
        "email": data.get("email", ""),
        "phone": data.get("phone", ""),
        "address": data.get("address", ""),
        "gst_number": data.get("gst_number", ""),
        "website": data.get("website", ""),
        "logo_url": data.get("logo_url", ""),
        "currency": data.get("currency", "INR"),
        "custom_fields": data.get("custom_fields", []),
    }


def _allocate_discount(amount, line_amount, total_line_amount):
    if amount <= 0 or total_line_amount <= 0 or line_amount <= 0:
        return 0
    return round_price(amount * (line_amount / total_line_amount))


def _invoice_sequence_suffix(sequence_number: int):
    if sequence_number < 1 or sequence_number > INVOICE_SEQUENCE_LIMIT:
        bad_request("Invoice number sequence limit reached")

    sequence_index = sequence_number - 1
    letter = string.ascii_uppercase[sequence_index // 9999]
    number = (sequence_index % 9999) + 1
    return f"{letter}{number:04d}"


def _invoice_sequence_from_suffix(suffix: str):
    match = INVOICE_SEQUENCE_PATTERN.match(suffix or "")
    if not match:
        return None

    letter, number = match.groups()
    return (string.ascii_uppercase.index(letter) * 9999) + int(number)


def _invoice_sequence_from_invoice_id(invoice_id: str):
    if not INVOICE_NUMBER_PATTERN.match(invoice_id or ""):
        return None
    return _invoice_sequence_from_suffix(invoice_id.rsplit("-", 1)[-1])


async def _max_saved_invoice_sequence():
    max_sequence = 0
    async for invoice in invoices_collection.find(
        {},
        {"_id": 0, "invoice_id": 1, "invoice_sequence": 1},
    ):
        sequence_number = invoice.get("invoice_sequence")
        if not sequence_number:
            sequence_number = _invoice_sequence_from_invoice_id(invoice.get("invoice_id"))
        if sequence_number:
            max_sequence = max(max_sequence, int(sequence_number))
    return max_sequence


async def _next_saved_invoice_sequence():
    next_sequence = (await _max_saved_invoice_sequence()) + 1
    if next_sequence > INVOICE_SEQUENCE_LIMIT:
        bad_request("Invoice number sequence limit reached")
    return next_sequence


def _generate_invoice_number(sequence_number: int):
    now = datetime.now(Settings.IST)
    return (
        f"INV-{now.strftime('%y%m%d')}-"
        f"{_invoice_sequence_suffix(sequence_number)}"
    )


def _invoice_item_to_sale_item(item: dict):
    discount_amount = round_price(
        item.get("offline_discount_amount", 0)
        + item.get("additional_discount_amount", 0)
    )
    subtotal = round_price(item.get("subtotal", 0))
    discount_percentage = round_price(
        (discount_amount / subtotal) * 100
    ) if subtotal else 0

    return {
        "sku": item.get("sku"),
        "name": item.get("name"),
        "quantity": item.get("quantity", 0),
        "unit_price": item.get("unit_price", 0),
        "subtotal": subtotal,
        "tax_percentage": item.get("tax_percentage", 0),
        "tax_amount": item.get("tax_amount", 0),
        "discount_percentage": discount_percentage,
        "discount_amount": discount_amount,
        "total_price": item.get("total_price", 0),
    }


async def _create_sale_from_invoice(auth_user: dict, invoice_document: dict):
    payment_status = _clean_text(invoice_document.get("payment_status")) or "PAID"
    payment_method = _clean_text(invoice_document.get("payment_method")) or "CASH"
    final_total_amount = invoice_document.get("final_total_amount", 0)
    total_paid = final_total_amount if payment_status.upper() == "PAID" else 0
    buyer = invoice_document.get("buyer") or {}

    sale_document = {
        "invoice_id": invoice_document.get("invoice_id"),
        "platform": "Offline" if invoice_document.get("sold_offline") else "Self Store",
        "user_info": {
            "name": buyer.get("name"),
            "phone": buyer.get("phone"),
            "email": buyer.get("email"),
            "address": buyer.get("address"),
            "gst_number": buyer.get("gst_number"),
            "place_of_supply": buyer.get("place_of_supply"),
        },
        "items": [
            _invoice_item_to_sale_item(item)
            for item in invoice_document.get("items", [])
        ],
        "subtotal": invoice_document.get("subtotal", 0),
        "total_tax": invoice_document.get("total_tax", 0),
        "total_discount": invoice_document.get("total_discount", 0),
        "final_total_amount": final_total_amount,
        "total_paid": total_paid,
        "payment_details": [{
            "payment_method": payment_method,
            "amount_paid": total_paid,
            "payment_status": payment_status,
        }],
        "sale_status": "SOLD",
        "notes": invoice_document.get("notes"),
        "source": "INVOICE",
        "invoice_record_id": str(invoice_document.get("_id")),
        "created_by": auth_user.get("username"),
        "stock_updated": True,
        "created_at": invoice_document.get("created_at") or datetime.now(UTC),
        "updated_at": datetime.now(UTC),
    }

    await sales_collection.insert_one(sale_document)

    await create_audit_log(
        module_name=AuditModule.SALES,
        event_type=AuditEvent.CREATED,
        reference_id=invoice_document.get("invoice_id"),
        performed_by=auth_user.get("username"),
        new_data={
            "invoice_id": invoice_document.get("invoice_id"),
            "platform": sale_document["platform"],
            "final_total_amount": final_total_amount,
            "total_items": len(sale_document["items"]),
            "source": "INVOICE",
        },
    )


async def create_invoice(auth_user: dict, invoice_data: dict):
    if auth_user.get("role") == UserRole.USER:
        forbidden("Only admins can create invoices")

    invoice_id = _clean_text(invoice_data.get("invoice_id"))
    if invoice_id and not INVOICE_NUMBER_PATTERN.match(invoice_id):
        bad_request("Invoice number must match INV-YYMMDD-A0001")
    invoice_sequence = (
        _invoice_sequence_from_invoice_id(invoice_id)
        if invoice_id
        else None
    )

    raw_items = invoice_data.get("items") or []
    if not raw_items:
        bad_request("At least one invoice item is required")

    prepared_items = []
    gross_subtotal = 0
    offline_discount_total = 0
    taxable_before_additional_discount = 0
    required_quantity_by_sku = {}

    for item in raw_items:
        sku = normalize_sku(item.get("sku"))
        product = await products_collection.find_one({"sku": sku})
        if not product:
            not_found("Product not found")
        if not product.get("is_active"):
            forbidden("Product is inactive")

        stock = await stocks_collection.find_one({"sku": sku})
        if not stock:
            bad_request("Insufficient stock")

        quantity = int(item.get("quantity") or 0)
        if quantity <= 0:
            bad_request("Quantity must be greater than zero")

        required_quantity_by_sku[sku] = required_quantity_by_sku.get(sku, 0) + quantity

        min_selling_price = round_price(stock.get("min_selling_price", 0) or 0)
        unit_price = item.get("unit_price")
        if unit_price is None:
            unit_price = min_selling_price
        unit_price = round_price(unit_price)

        line_subtotal = round_price(quantity * unit_price)
        offline_discount_amount = round_price(
            line_subtotal * (OFFLINE_DISCOUNT_PERCENTAGE / 100)
        ) if invoice_data.get("sold_offline") else 0
        taxable_base = round_price(line_subtotal - offline_discount_amount)

        gross_subtotal += line_subtotal
        offline_discount_total += offline_discount_amount
        taxable_before_additional_discount += taxable_base

        prepared_items.append({
            "sku": sku,
            "name": product.get("name"),
            "description": product.get("description"),
            "hsn_sac": product.get("hsn_sac", ""),
            "unit_of_measure": product.get("unit_of_measure", "pcs"),
            "quantity": quantity,
            "min_selling_price": min_selling_price,
            "unit_price": unit_price,
            "subtotal": line_subtotal,
            "offline_discount_percentage": (
                OFFLINE_DISCOUNT_PERCENTAGE if invoice_data.get("sold_offline") else 0
            ),
            "offline_discount_amount": offline_discount_amount,
            "taxable_base": taxable_base,
            "tax_percentage": product.get("tax_rate", 0) or 0,
        })

    for sku, required_quantity in required_quantity_by_sku.items():
        stock = await stocks_collection.find_one({"sku": sku})
        if not stock or stock.get("quantity", 0) < required_quantity:
            bad_request("Insufficient stock")

    additional_discount = min(
        round_price(invoice_data.get("additional_discount") or 0),
        round_price(taxable_before_additional_discount),
    )
    allocated_discount_total = 0
    total_tax = 0
    final_items = []

    for index, item in enumerate(prepared_items):
        if index == len(prepared_items) - 1:
            item_additional_discount = round_price(
                additional_discount - allocated_discount_total
            )
        else:
            item_additional_discount = _allocate_discount(
                additional_discount,
                item["taxable_base"],
                taxable_before_additional_discount,
            )
            allocated_discount_total += item_additional_discount

        taxable_amount = round_price(item["taxable_base"] - item_additional_discount)
        tax_amount = round_price(taxable_amount * ((item["tax_percentage"] or 0) / 100))
        total_price = round_price(taxable_amount + tax_amount)
        total_tax += tax_amount
        final_items.append({
            **item,
            "additional_discount_amount": item_additional_discount,
            "taxable_amount": taxable_amount,
            "tax_amount": tax_amount,
            "total_price": total_price,
        })

    total_discount = round_price(offline_discount_total + additional_discount)
    final_total_amount = round_final_amount(
        gross_subtotal - total_discount + total_tax
    )

    invoice_document = {
        "invoice_id": invoice_id or "",
        "invoice_sequence": invoice_sequence,
        "invoice_date": invoice_data.get("invoice_date") or datetime.now(UTC),
        "company": await _company_snapshot(),
        "buyer": {
            "name": _clean_text(invoice_data.get("buyer", {}).get("name")),
            "phone": _clean_text(invoice_data.get("buyer", {}).get("phone")),
            "email": _clean_text(invoice_data.get("buyer", {}).get("email")),
            "address": _clean_text(invoice_data.get("buyer", {}).get("address")),
            "gst_number": _clean_text(invoice_data.get("buyer", {}).get("gst_number")),
            "place_of_supply": _clean_text(invoice_data.get("buyer", {}).get("place_of_supply")),
        },
        "items": final_items,
        "sold_offline": bool(invoice_data.get("sold_offline")),
        "subtotal": round_price(gross_subtotal),
        "offline_discount_percentage": (
            OFFLINE_DISCOUNT_PERCENTAGE if invoice_data.get("sold_offline") else 0
        ),
        "offline_discount_amount": round_price(offline_discount_total),
        "additional_discount": additional_discount,
        "total_discount": total_discount,
        "total_tax": round_price(total_tax),
        "final_total_amount": final_total_amount,
        "payment_method": _clean_text(invoice_data.get("payment_method")) or "CASH",
        "payment_status": _clean_text(invoice_data.get("payment_status")) or "PAID",
        "notes": _clean_text(invoice_data.get("notes")),
        "created_by": auth_user.get("username"),
        "created_at": datetime.now(UTC),
        "updated_at": datetime.now(UTC),
    }

    for _ in range(5):
        if not invoice_document["invoice_id"]:
            invoice_sequence = await _next_saved_invoice_sequence()
            invoice_document["invoice_sequence"] = invoice_sequence
            invoice_document["invoice_id"] = _generate_invoice_number(invoice_sequence)

        try:
            result = await invoices_collection.insert_one(invoice_document)
            break
        except DuplicateKeyError:
            if invoice_id:
                bad_request("Invoice number already exists")
            invoice_document["invoice_id"] = ""
            invoice_document["invoice_sequence"] = None
    else:
        bad_request("Could not generate a unique invoice number")

    invoice_id = invoice_document["invoice_id"]

    for item in final_items:
        stock_decreased = await decrease_stock(
            sku=item.get("sku"),
            quantity=item.get("quantity"),
        )
        if not stock_decreased:
            bad_request("Insufficient stock")

    await create_audit_log(
        module_name=AuditModule.INVOICE,
        event_type=AuditEvent.CREATED,
        reference_id=invoice_id,
        performed_by=auth_user.get("username"),
        new_data={
            "invoice_id": invoice_id,
            "final_total_amount": final_total_amount,
            "total_items": len(final_items),
        },
    )

    created_invoice = await invoices_collection.find_one({"_id": result.inserted_id})
    await _create_sale_from_invoice(auth_user, created_invoice)
    return build_invoice_response(created_invoice)


async def get_invoices(
    auth_user: dict,
    invoice_id: str = None,
    search: str = None,
    sort_by: str = "created_at",
    order: str = "desc",
    page: int = 1,
    limit: int = 10,
):
    if auth_user.get("role") not in [
        UserRole.SUPERADMIN,
        UserRole.ADMIN,
        UserRole.USER,
    ]:
        forbidden()

    filters = {}
    if invoice_id:
        filters["invoice_id"] = invoice_id

    validate_sort_field(sort_by, [
        "created_at",
        "updated_at",
        "invoice_id",
        "invoice_date",
        "final_total_amount",
        "payment_status",
    ])
    filters.update(regex_filter(search, [
        "invoice_id",
        "buyer.name",
        "buyer.phone",
        "buyer.email",
        "buyer.gst_number",
        "items.sku",
        "items.name",
    ]))

    return await paginate_collection(
        invoices_collection,
        filters,
        sort_by,
        order,
        page,
        limit,
        build_invoice_response,
    )


async def get_invoice(auth_user: dict, invoice_record_id: str):
    if auth_user.get("role") not in [
        UserRole.SUPERADMIN,
        UserRole.ADMIN,
        UserRole.USER,
    ]:
        forbidden()

    if not is_valid_object_id(invoice_record_id):
        bad_request("Invalid invoice id")

    invoice = await invoices_collection.find_one({"_id": ObjectId(invoice_record_id)})
    if not invoice:
        not_found("Invoice not found")

    return build_invoice_response(invoice)
