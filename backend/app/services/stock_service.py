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


def _percentage_amount(base_price: float, key: str):
    config = PERCENTAGE_CHARGES[key]
    amount = round_price(base_price * (config["percent"] / 100))
    if "min" in config:
        amount = max(amount, config["min"])
    if "max" in config:
        amount = min(amount, config["max"])
    return round_price(amount)


def _charge_row(label: str, default_value: float, custom_value=None):
    return {
        "label": label,
        "default": round_price(default_value),
        "custom": round_price(custom_value) if custom_value is not None else None,
    }


def _total_price(base_price: float, charges: dict, use_custom: bool):
    total = base_price
    for key, charge in charges.items():
        if key == "gst":
            total += charge["default"]
            continue
        total += (
            charge["custom"]
            if use_custom and charge["custom"] is not None
            else charge["default"]
        )
    return round_final_amount(total)


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

    charges = {
        "marketplace_commission": _charge_row(
            "Marketplace referral fee",
            0,
            overrides.get("marketplace_commission"),
        ),
        "shipping_charges": _charge_row(
            "Courier shipping fee",
            _shipping_charge(chargeable_weight),
            overrides.get("shipping_charges"),
        ),
        "platform_fees": _charge_row(
            "Platform payment fee",
            _percentage_amount(base_price, "platform_fees"),
            overrides.get("platform_fees"),
        ),
        "packaging_charges": _charge_row(
            "Packing material cost",
            _packaging_charge(packing_types, packing_size),
            overrides.get("packaging_charges"),
        ),
        "gst": _charge_row(
            "GST",
            round_price(base_price * (tax_rate / 100)),
        ),
        "return_rto": _charge_row(
            "Return and RTO provision",
            _percentage_amount(base_price, "return_rto"),
            overrides.get("return_rto"),
        ),
        "margin": _charge_row(
            "Target profit margin",
            _percentage_amount(base_price, "margin"),
            overrides.get("margin"),
        ),
        "misc": _charge_row(
            "Operational overhead buffer",
            _percentage_amount(base_price, "misc"),
            overrides.get("misc"),
        ),
        "advertisement": _charge_row(
            "Advertising allocation",
            _percentage_amount(base_price, "advertisement"),
            overrides.get("advertisement"),
        ),
        "promotion": _charge_row(
            "Promotion discount buffer",
            _percentage_amount(base_price, "promotion"),
            overrides.get("promotion"),
        ),
    }

    default_selling_price = _total_price(base_price, charges, use_custom=False)
    custom_selling_price = _total_price(base_price, charges, use_custom=True)

    if calculation_data.get("save_default"):
        await stocks_collection.update_one(
            {"sku": sku},
            {
                "$set": {
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
                        "default_selling_price": default_selling_price,
                    },
                    "updated_at": datetime.now(UTC),
                }
            }
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
        "default_selling_price": default_selling_price,
        "custom_selling_price": custom_selling_price,
        "saved": bool(calculation_data.get("save_default")),
    }


async def increase_stock(
    sku: str,
    name: str,
    quantity: int,
    unit_price: float,
    supplier_id: str = None
):

    existing_stock = await stocks_collection.find_one({
        "sku": sku
    })

    # CREATE NEW STOCK
    if not existing_stock:

        avg_price = round_price(unit_price)

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
            "created_at": datetime.now(UTC),
            "updated_at": datetime.now(UTC)
        }

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

    inventory_value = round_final_amount(
        new_quantity * avg_price
    )

    set_data = {
        "quantity": new_quantity,
        "avg_price": avg_price,
        "inventory_value": inventory_value,
        "stock_status": calculate_stock_status(
            new_quantity
        ),
        "updated_at": datetime.now(UTC)
    }

    if supplier_id:
        set_data["supplier_id"] = supplier_id

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
