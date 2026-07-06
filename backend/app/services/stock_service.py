from datetime import datetime, UTC

from app.database.mongodb import db
from app.models.stock import StockStatus

from app.utils.settings import Settings

from app.utils.helpers import (
    round_price,
    round_final_amount,
    normalize_sku
)
from app.utils.responseBuilder import build_stock_response
from app.utils.pagination import page_bounds, regex_filter, sort_direction, validate_sort_field

from app.utils.messages import Messages
from app.models.auth import UserRole

from app.core.exceptions import (
    forbidden,
    not_found,
    bad_request
)
from app.services.audit_service import (
    create_audit_log
)
from app.services.notification_service import create_system_out_of_stock_notification
from app.models.audit import (
    AuditEvent, AuditModule
)
stocks_collection = db.stocks
products_collection = db.products
suppliers_collection = db.suppliers

PACKAGING_CHARGES = {
    "Cardbox": {"S": 8, "M": 12, "L": 15},
    "Pollybag": {"S": 5, "M": 7, "L": 10},
}
MAX_PACKAGING_CHARGE = 15

PERCENTAGE_CHARGES = {
    "platform_fees": {"percent": 5, "min": 10, "max": 25},
    "return_rto": {"percent": 10},
    "margin": {"percent": 30},
    "misc": {"percent": 5},
    "advertisement": {"percent": 2},
    "promotion": {"percent": 5},
}


def normalize_barcode(barcode: str | None) -> str:
    return str(barcode or "").strip()


async def ensure_barcode_available(barcode: str, sku: str):
    if not barcode:
        return

    existing_stock = await stocks_collection.find_one({
        "barcode": barcode,
        "sku": {"$ne": sku},
    })
    if existing_stock:
        bad_request("Barcode is already assigned to another stock item")
DEFAULT_CHARGE_SETTINGS = {
    "marketplace_commission": 0,
    "shipping_charges": None,
    "platform_fees_percent": 5,
    "platform_fees_min": 10,
    "platform_fees_max": 25,
    "packaging_charges": None,
    "return_rto_percent": 10,
    "margin_percent": 30,
    "misc_percent": 5,
    "advertisement_percent": 2,
    "promotion_percent": 5,
}


def calculate_stock_status(quantity: int):

    if quantity <= Settings.OUT_OF_STOCK_CHECK:
        return StockStatus.OUT_OF_STOCK

    if quantity < Settings.LOW_STOCK_CHECK:
        return StockStatus.LOW_QUANTITY

    return StockStatus.IN_STOCK


def _shipping_charge(weight: float):
    if weight <= 500:
        return 35
    if weight <= 1000:
        return 70
    return 100


def _packaging_charge(packing_types: list[str], packing_size: str):
    total = sum(
        PACKAGING_CHARGES.get(packing_type, {}).get(packing_size, 0)
        for packing_type in packing_types
    )
    return min(total, MAX_PACKAGING_CHARGE)


def _percentage_amount(base_price: float, key: str, settings: dict | None = None):
    settings = {**DEFAULT_CHARGE_SETTINGS, **(settings or {})}
    config = PERCENTAGE_CHARGES[key]
    percent = settings.get(f"{key}_percent", config["percent"])
    amount = round_price(base_price * (percent / 100))
    min_value = settings.get(f"{key}_min", config.get("min"))
    max_value = settings.get(f"{key}_max", config.get("max"))
    if min_value is not None:
        amount = max(amount, min_value)
    if max_value is not None:
        amount = min(amount, max_value)
    return round_price(amount)


def _charge_row(label: str, default_value: float, custom_value=None):
    return {
        "label": label,
        "default": round_price(default_value),
        "custom": round_price(custom_value) if custom_value is not None else None,
    }


def _selected_charge(charges: dict, key: str, use_custom: bool):
    charge = charges[key]
    if use_custom and charge["custom"] is not None:
        return charge["custom"]
    return charge["default"]


def _price_breakdown(
    base_price: float,
    tax_rate: float,
    chargeable_weight: float,
    packing_types: list[str],
    packing_size: str,
    overrides: dict | None = None,
    settings: dict | None = None,
):
    overrides = overrides or {}
    settings = {**DEFAULT_CHARGE_SETTINGS, **(settings or {})}
    shipping_charge = (
        settings["shipping_charges"]
        if settings.get("shipping_charges") is not None
        else _shipping_charge(chargeable_weight)
    )
    packaging_charge = (
        settings["packaging_charges"]
        if settings.get("packaging_charges") is not None
        else _packaging_charge(packing_types, packing_size)
    )

    charges = {
        "marketplace_commission": _charge_row(
            "Marketplace referral fee",
            settings["marketplace_commission"],
            overrides.get("marketplace_commission"),
        ),
        "shipping_charges": _charge_row(
            "Courier shipping fee",
            shipping_charge,
            overrides.get("shipping_charges"),
        ),
        "platform_fees": _charge_row(
            "Platform payment fee",
            _percentage_amount(base_price, "platform_fees", settings),
            overrides.get("platform_fees"),
        ),
        "packaging_charges": _charge_row(
            "Packing material cost",
            packaging_charge,
            overrides.get("packaging_charges"),
        ),
        "margin": _charge_row(
            "Target profit margin",
            _percentage_amount(base_price, "margin", settings),
            overrides.get("margin"),
        ),
    }

    primary_default_total = base_price + sum(
        charges[key]["default"]
        for key in [
            "marketplace_commission",
            "shipping_charges",
            "platform_fees",
            "packaging_charges",
            "margin",
        ]
    )
    primary_custom_total = base_price + sum(
        _selected_charge(charges, key, use_custom=True)
        for key in [
            "marketplace_commission",
            "shipping_charges",
            "platform_fees",
            "packaging_charges",
            "margin",
        ]
    )

    for key, label in [
        ("return_rto", "Return and RTO provision"),
        ("misc", "Operational overhead buffer"),
        ("advertisement", "Advertising allocation"),
        ("promotion", "Promotion discount buffer"),
    ]:
        charges[key] = _charge_row(
            label,
            _percentage_amount(primary_default_total, key, settings),
            _percentage_amount(primary_custom_total, key, settings),
        )

    default_pre_gst_total = primary_default_total + sum(
        charges[key]["default"]
        for key in ["return_rto", "misc", "advertisement", "promotion"]
    )
    custom_pre_gst_total = primary_custom_total + sum(
        _selected_charge(charges, key, use_custom=True)
        for key in ["return_rto", "misc", "advertisement", "promotion"]
    )

    custom_gst = round_price(custom_pre_gst_total * ((tax_rate or 0) / 100))
    charges["gst"] = _charge_row(
        "GST",
        round_price(default_pre_gst_total * ((tax_rate or 0) / 100)),
        custom_gst,
    )

    default_selling_price = round_final_amount(default_pre_gst_total)
    custom_selling_price = round_final_amount(custom_pre_gst_total)

    return {
        "charges": charges,
        "default_selling_price": default_selling_price,
        "custom_selling_price": custom_selling_price,
    }


def _default_selling_price_for_stock(base_price: float, tax_rate: float = 0):
    return _price_breakdown(
        base_price=base_price,
        tax_rate=tax_rate,
        chargeable_weight=0,
        packing_types=[],
        packing_size="S",
    )["default_selling_price"]


async def calculate_selling_price(auth_user: dict, calculation_data: dict):
    if auth_user.get("role") not in [UserRole.SUPERADMIN, UserRole.ADMIN]:
        forbidden()

    sku = normalize_sku(calculation_data.get("sku"))
    stock = await stocks_collection.find_one({"sku": sku})
    if not stock:
        not_found(Messages.STOCK_NOT_FOUND)

    product = await products_collection.find_one({"sku": sku}) or {}
    base_price = round_price(stock.get("avg_price", 0))
    tax_rate = product.get("tax_rate", stock.get("tax_rate", 0) or 0)
    dead_weight = calculation_data.get("dead_weight", 0) or 0
    volumetric_weight = calculation_data.get("volumetric_weight", 0) or 0
    chargeable_weight = max(dead_weight, volumetric_weight)
    packing_types = calculation_data.get("packing_types") or []
    packing_size = calculation_data.get("packing_size") or "S"
    overrides = calculation_data.get("overrides") or {}
    settings = calculation_data.get("settings") or {}

    pricing = _price_breakdown(
        base_price=base_price,
        tax_rate=tax_rate,
        chargeable_weight=chargeable_weight,
        packing_types=packing_types,
        packing_size=packing_size,
        overrides=overrides,
        settings=settings,
    )
    charges = pricing["charges"]
    default_selling_price = pricing["default_selling_price"]
    custom_selling_price = pricing["custom_selling_price"]

    if calculation_data.get("save_default"):
        actual_price = calculation_data.get("actual_price")
        set_data = {
            "min_selling_price": default_selling_price,
            "selling_price_calculation": {
                "base_price": base_price,
                "tax_rate": tax_rate,
                "dead_weight": dead_weight,
                "volumetric_weight": volumetric_weight,
                "chargeable_weight": chargeable_weight,
                "packing_types": packing_types,
                "packing_size": packing_size,
                "charges": charges,
                "settings": {**DEFAULT_CHARGE_SETTINGS, **settings},
                "default_selling_price": default_selling_price,
            },
            "updated_at": datetime.now(UTC),
        }
        if actual_price is not None:
            set_data["actual_price"] = round_price(actual_price)

        await stocks_collection.update_one(
            {"sku": sku},
            {"$set": set_data}
        )

    return {
        "sku": sku,
        "name": stock.get("name"),
        "base_price": base_price,
        "tax_rate": tax_rate,
        "dead_weight": dead_weight,
        "volumetric_weight": volumetric_weight,
        "chargeable_weight": chargeable_weight,
        "packing_types": packing_types,
        "packing_size": packing_size,
        "charges": charges,
        "settings": {**DEFAULT_CHARGE_SETTINGS, **settings},
        "default_selling_price": default_selling_price,
        "custom_selling_price": custom_selling_price,
        "saved": bool(calculation_data.get("save_default")),
    }


async def increase_stock(
    sku: str,
    name: str,
    quantity: int,
    unit_price: float,
    supplier_id: str = None,
    barcode: str = None
):
    barcode = normalize_barcode(barcode)

    existing_stock = await stocks_collection.find_one({
        "sku": sku
    })

    await ensure_barcode_available(barcode, sku)

    # CREATE NEW STOCK
    if not existing_stock:

        avg_price = round_price(unit_price)
        product = await products_collection.find_one({"sku": sku}) or {}
        tax_rate = product.get("tax_rate", 0)

        inventory_value = round_final_amount(
            quantity * avg_price,
        )

        stock_data = {
            "sku": sku,
            "name": name,
            "supplier_id": supplier_id,
            "quantity": quantity,
            "avg_price": avg_price,
            "inventory_value": inventory_value,
            "stock_status": calculate_stock_status(
                quantity
            ),
            "min_selling_price": _default_selling_price_for_stock(avg_price, tax_rate),
            "actual_price": _default_selling_price_for_stock(avg_price, tax_rate),
            "created_at": datetime.now(UTC),
            "updated_at": datetime.now(UTC)
        }
        if barcode:
            stock_data["barcode"] = barcode

        await stocks_collection.insert_one(
            stock_data
        )

        await create_audit_log(
            module_name=AuditModule.STOCK,
            event_type=AuditEvent.STOCK_INCREASED,
            sku=sku,
            performed_by=Messages.SYSTEM,
            old_data={
                "quantity": 0,
                "avg_price": 0,
                "inventory_value": 0
            },
            new_data={
                "quantity": quantity,
                "avg_price": avg_price,
                "inventory_value": inventory_value
            }
        )
        return

    # UPDATE EXISTING STOCK
    old_quantity = existing_stock.get(
        "quantity",
        0
    )

    old_avg_price = existing_stock.get(
        "avg_price",
        0
    )

    old_inventory_value = existing_stock.get(
        "inventory_value",
        0
    )

    new_quantity = old_quantity + quantity

    total_old_value = old_quantity * old_avg_price

    total_new_value = quantity * unit_price

    avg_price = round_price(
        (total_old_value + total_new_value) / new_quantity
    )
    product = await products_collection.find_one({"sku": sku}) or {}
    tax_rate = product.get("tax_rate", 0)

    inventory_value = round_final_amount(
        new_quantity * avg_price
    )

    set_data = {
        "quantity": new_quantity,
        "avg_price": avg_price,
        "inventory_value": inventory_value,
        "min_selling_price": _default_selling_price_for_stock(avg_price, tax_rate),
        "actual_price": existing_stock.get(
            "actual_price",
            existing_stock.get("min_selling_price", _default_selling_price_for_stock(avg_price, tax_rate)),
        ),
        "stock_status": calculate_stock_status(
            new_quantity
        ),
        "updated_at": datetime.now(UTC)
    }

    if supplier_id:
        set_data["supplier_id"] = supplier_id

    if barcode:
        set_data["barcode"] = barcode

    await stocks_collection.update_one(
        {
            "sku": sku
        },
        {
            "$set": set_data
        }
    )

    if calculate_stock_status(new_quantity) == StockStatus.OUT_OF_STOCK:
        await create_system_out_of_stock_notification(
            sku=sku,
            name=existing_stock.get("name")
        )

    await create_audit_log(
        module_name=AuditModule.STOCK,
        event_type=AuditEvent.STOCK_INCREASED,
        sku=sku,
        performed_by=Messages.SYSTEM,
        old_data={
            "quantity": old_quantity,
            "avg_price": old_avg_price,
            "inventory_value": old_inventory_value
        },
        new_data={
            "quantity": new_quantity,
            "avg_price": avg_price,
            "inventory_value": inventory_value
        }
    )


async def decrease_stock(
    sku: str,
    quantity: int
):

    existing_stock = await stocks_collection.find_one({
        "sku": sku
    })

    if not existing_stock:
        return False

    current_quantity = existing_stock.get(
        "quantity",
        0
    )

    if current_quantity < quantity:
        return False

    new_quantity = current_quantity - quantity

    avg_price = existing_stock.get(
        "avg_price",
        0
    )
    
    old_inventory_value = existing_stock.get(
        "inventory_value",
        0
    )

    inventory_value = round_final_amount(
        new_quantity * avg_price
    )

    await stocks_collection.update_one(
        {
            "sku": sku
        },
        {
            "$set": {
                "quantity": new_quantity,
                "inventory_value": inventory_value,
                "stock_status": calculate_stock_status(
                    new_quantity
                ),
                "updated_at": datetime.now(UTC)
            }
        }
    )

    if current_quantity > 0 and new_quantity == 0:
        product = await products_collection.find_one({"sku": sku})
        supplier_id = (
            existing_stock.get("supplier_id")
            or (product or {}).get("supplier_id")
        )
        supplier = None
        if supplier_id:
            supplier = await suppliers_collection.find_one({
                "supplier_id": supplier_id
            })

        await create_system_out_of_stock_notification(
            sku=sku,
            name=(product or {}).get("name") or existing_stock.get("name"),
            supplier_name=(supplier or {}).get("name") or supplier_id or "-"
        )

    await create_audit_log(
        module_name=AuditModule.STOCK,
        event_type=AuditEvent.STOCK_DECREASED,
        sku=sku,
        performed_by=Messages.SYSTEM,
        old_data={
            "quantity": current_quantity,
            "avg_price": avg_price,
            "inventory_value": old_inventory_value
        },
        new_data={
            "quantity": new_quantity,
            "avg_price": avg_price,
            "inventory_value": inventory_value
        }
    )

    return True


async def record_unsellable_stock(
    sku: str,
    name: str,
    quantity: int,
    item_status: str,
    unit_price: float = 0,
    supplier_id: str = None
):
    existing_stock = await stocks_collection.find_one({
        "sku": sku
    })

    field = "damaged_quantity" if item_status == "DAMAGED" else "lost_quantity"

    if not existing_stock:
        stock_data = {
            "sku": sku,
            "name": name,
            "supplier_id": supplier_id,
            "quantity": 0,
            "avg_price": round_price(unit_price),
            "inventory_value": 0,
            "damaged_quantity": quantity if field == "damaged_quantity" else 0,
            "lost_quantity": quantity if field == "lost_quantity" else 0,
            "stock_status": calculate_stock_status(0),
            "created_at": datetime.now(UTC),
            "updated_at": datetime.now(UTC)
        }
        await stocks_collection.insert_one(stock_data)
        return

    old_quantity = existing_stock.get(field, 0)

    await stocks_collection.update_one(
        {"sku": sku},
        {
            "$set": {"updated_at": datetime.now(UTC)},
            "$inc": {field: quantity}
        }
    )

    await create_audit_log(
        module_name=AuditModule.STOCK,
        event_type=AuditEvent.STOCK_ADJUSTED,
        sku=sku,
        performed_by=Messages.SYSTEM,
        old_data={field: old_quantity},
        new_data={field: old_quantity + quantity}
    )


async def get_stocks(
    auth_user: dict,
    sku: str = None,
    search: str = None,
    stock_status: str = None,
    sort_by: str = "created_at",
    sort_order: str = "desc",
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
        "sku",
        "name",
        "quantity",
        "stock_status",
        "avg_price",
        "actual_price",
        "min_selling_price",
        "inventory_value",
    ]

    validate_sort_field(sort_by, allowed_sort_fields)

    if sku:
        filters["sku"] = normalize_sku(sku)

    if stock_status:
        valid_status = [status.value for status in StockStatus]

        if stock_status not in valid_status:
            bad_request(Messages.INVALID_STOCK_STATUS)

        filters["stock_status"] = stock_status

    filters.update(regex_filter(search, ["sku", "name", "supplier_id", "stock_status"]))

    stock_records = []

    page, limit, skip = page_bounds(page, limit)
    sort_order = sort_direction(sort_order)
    total = await stocks_collection.count_documents(filters)

    async for stock in stocks_collection.find(
        filters
    ).sort(sort_by, sort_order).skip(skip).limit(limit):
        stock_records.append(stock)

    skus = [stock.get("sku") for stock in stock_records if stock.get("sku")]
    tax_rate_by_sku = {}
    async for product in products_collection.find(
        {"sku": {"$in": skus}},
        {"_id": 0, "sku": 1, "tax_rate": 1}
    ):
        tax_rate_by_sku[product.get("sku")] = product.get("tax_rate", 0)

    stocks = []
    for stock in stock_records:
        stock["tax_rate"] = tax_rate_by_sku.get(stock.get("sku"), 0)
        stocks.append(build_stock_response(stock))

    return {
        "items": stocks,
        "pagination": {
            "page": page,
            "limit": limit,
            "total": total,
            "pages": max((total + limit - 1) // limit, 1),
            "has_prev": page > 1,
            "has_next": page * limit < total,
        },
    }


async def get_stock_by_barcode(auth_user: dict, barcode: str):
    if auth_user.get("role") not in [
        UserRole.SUPERADMIN,
        UserRole.ADMIN,
        UserRole.USER
    ]:
        forbidden()

    barcode = normalize_barcode(barcode)
    if not barcode:
        bad_request("Barcode is required")

    stock = await stocks_collection.find_one({"barcode": barcode})
    if not stock:
        not_found("Stock not found for this barcode")

    product = await products_collection.find_one({"sku": stock.get("sku")}, {"_id": 0, "tax_rate": 1})
    stock["tax_rate"] = (product or {}).get("tax_rate", 0)

    return build_stock_response(stock)


async def update_stock_actual_price(auth_user: dict, sku: str, actual_price: float):
    if auth_user.get("role") not in [UserRole.SUPERADMIN, UserRole.ADMIN]:
        forbidden()

    sku = normalize_sku(sku)
    stock = await stocks_collection.find_one({"sku": sku})
    if not stock:
        not_found(Messages.STOCK_NOT_FOUND)

    actual_price = round_price(actual_price or 0)
    await stocks_collection.update_one(
        {"sku": sku},
        {
            "$set": {
                "actual_price": actual_price,
                "updated_at": datetime.now(UTC),
            }
        },
    )

    updated_stock = await stocks_collection.find_one({"sku": sku})
    product = await products_collection.find_one({"sku": sku}, {"_id": 0, "tax_rate": 1})
    updated_stock["tax_rate"] = (product or {}).get("tax_rate", 0)

    await create_audit_log(
        module_name=AuditModule.STOCK,
        event_type=AuditEvent.UPDATED,
        sku=sku,
        performed_by=auth_user.get("username"),
        old_data={"actual_price": stock.get("actual_price", 0)},
        new_data={"actual_price": actual_price},
    )

    return build_stock_response(updated_stock)


async def update_stock_barcode(auth_user: dict, sku: str, barcode: str | None):
    if auth_user.get("role") not in [UserRole.SUPERADMIN, UserRole.ADMIN]:
        forbidden()

    sku = normalize_sku(sku)
    barcode = normalize_barcode(barcode)
    stock = await stocks_collection.find_one({"sku": sku})
    if not stock:
        not_found(Messages.STOCK_NOT_FOUND)

    await ensure_barcode_available(barcode, sku)

    update_query = {
        "$set": {
            "updated_at": datetime.now(UTC),
        }
    }
    if barcode:
        update_query["$set"]["barcode"] = barcode
    else:
        update_query["$unset"] = {"barcode": ""}

    await stocks_collection.update_one({"sku": sku}, update_query)

    updated_stock = await stocks_collection.find_one({"sku": sku})
    product = await products_collection.find_one({"sku": sku}, {"_id": 0, "tax_rate": 1})
    updated_stock["tax_rate"] = (product or {}).get("tax_rate", 0)

    await create_audit_log(
        module_name=AuditModule.STOCK,
        event_type=AuditEvent.UPDATED,
        sku=sku,
        performed_by=auth_user.get("username"),
        old_data={"barcode": stock.get("barcode", "")},
        new_data={"barcode": barcode},
    )

    return build_stock_response(updated_stock)
