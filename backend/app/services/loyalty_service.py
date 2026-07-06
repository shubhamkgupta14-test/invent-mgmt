from datetime import datetime, UTC
import secrets
import string

from bson import ObjectId

from app.core.exceptions import bad_request, forbidden, not_found
from app.database.mongodb import db
from app.models.audit import AuditEvent, AuditModule
from app.models.auth import UserRole
from app.models.loyalty import LoyaltyStatus
from app.services.audit_service import create_audit_log
from app.utils.helpers import round_price
from app.utils.pagination import paginate_collection, regex_filter, validate_sort_field
from app.utils.responseBuilder import build_loyalty_response
from app.utils.settings import Settings

loyalty_collection = db.loyalty
sales_collection = db.sales

QUALIFIED = "QUALIFIED"
DISQUALIFIED = "DISQUALIFIED"
REDEEM_ORDER = "REDEEM_ORDER"
SOLD = "SOLD"
MAX_REDEEM_AMOUNT = 150
ACTIVE_STATUSES = [LoyaltyStatus.PENDING.value, LoyaltyStatus.ELIGIBLE.value]
TERMINAL_STATUSES = [LoyaltyStatus.REDEEMED.value, LoyaltyStatus.CANCELLED.value]


def _can_view(auth_user: dict):
    if auth_user.get("role") not in [UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.USER]:
        forbidden()


def _can_mutate(auth_user: dict):
    if auth_user.get("role") not in [UserRole.SUPERADMIN, UserRole.ADMIN]:
        forbidden()


def _normalize_email(email: str):
    return (email or "").strip().lower()


def _normalize_order_id(order_id: str):
    return (order_id or "").strip()


def _config():
    return {
        "required_order_count": Settings.LOYALTY_REQUIRED_ORDER_COUNT,
        "max_disqualified_orders": Settings.LOYALTY_MAX_DISQUALIFIED_ORDERS,
        "ref_length": Settings.LOYALTY_REF_LENGTH,
        "discount_type": Settings.LOYALTY_DISCOUNT_TYPE,
        "discount_value": Settings.LOYALTY_DISCOUNT_VALUE,
        "max_redeem_amount": MAX_REDEEM_AMOUNT,
    }


def get_loyalty_config():
    return _config()


def _progress_message(qualified_count: int, required_count: int):
    if qualified_count >= required_count:
        return f"All {required_count} eligible orders are completed. Loyalty offer is ready to redeem."

    remaining = required_count - qualified_count
    order_word = "order" if qualified_count == 1 else "orders"
    remaining_word = "order" if remaining == 1 else "orders"
    return (
        f"{qualified_count} {order_word} completed. "
        f"Add {remaining} more eligible {remaining_word} to unlock the loyalty offer."
    )


def _note(message: str, auth_user: dict | None = None):
    return {
        "message": message,
        "created_by": auth_user.get("username") if auth_user else "system",
        "created_at": datetime.now(UTC),
    }


async def _generate_ref_no():
    alphabet = string.ascii_uppercase + string.digits
    length = max(Settings.LOYALTY_REF_LENGTH, 4)

    for _ in range(10):
        ref_no = "".join(secrets.choice(alphabet) for _ in range(length))
        if not await loyalty_collection.find_one({"ref_no": ref_no}):
            return ref_no

    bad_request("Unable to generate unique loyalty reference")


async def _get_sale(order_id: str):
    order_id = _normalize_order_id(order_id)
    sale = await sales_collection.find_one({"invoice_id": order_id})
    if not sale and ObjectId.is_valid(order_id):
        sale = await sales_collection.find_one({"_id": ObjectId(order_id)})
    return sale


def _sale_order_id(sale: dict):
    return sale.get("invoice_id") or str(sale.get("_id"))


def _sale_status(sale: dict | None):
    return (sale or {}).get("sale_status") or "UNKNOWN"


def _calculate_redeem_amount(loyalty: dict, sale: dict):
    sale_total = float(sale.get("final_total_amount") or 0)
    discount_type = loyalty.get("discount_type") or Settings.LOYALTY_DISCOUNT_TYPE
    discount_value = float(loyalty.get("discount_value") or Settings.LOYALTY_DISCOUNT_VALUE or 0)

    if discount_type == "PERCENTAGE":
        amount = sale_total * (discount_value / 100)
    else:
        amount = discount_value

    return round_price(min(amount, MAX_REDEEM_AMOUNT))


async def _validate_sale_for_add(order_id: str):
    sale = await _get_sale(order_id)
    if not sale:
        not_found("No valid sale found for this order ID")

    if _sale_status(sale) != SOLD:
        bad_request(f"This order is not eligible because its sale status is {_sale_status(sale)}")

    return sale


async def _find_loyalty_by_email_or_ref(email: str = None, ref_no: str = None):
    query = {}
    if ref_no:
        query["ref_no"] = ref_no.strip().upper()
    elif email:
        query["email"] = _normalize_email(email)
        query["status"] = {"$in": ACTIVE_STATUSES}
    else:
        bad_request("Email or loyalty reference is required")

    loyalty = await loyalty_collection.find_one(query, sort=[("created_at", -1)])
    if not loyalty:
        not_found("Loyalty record not found")

    return loyalty


async def _find_active_loyalty_by_email(email: str):
    return await loyalty_collection.find_one(
        {"email": _normalize_email(email), "status": {"$in": ACTIVE_STATUSES}},
        sort=[("created_at", -1)],
    )


def _calculate_counts(orders: list):
    qualified = sum(1 for order in orders if order.get("loyalty_status") == QUALIFIED)
    disqualified = sum(1 for order in orders if order.get("loyalty_status") == DISQUALIFIED)
    return qualified, disqualified


def _derive_status(loyalty: dict, qualified_count: int, disqualified_count: int):
    if loyalty.get("status") == LoyaltyStatus.REDEEMED:
        return LoyaltyStatus.REDEEMED
    if loyalty.get("status") == LoyaltyStatus.CANCELLED:
        return LoyaltyStatus.CANCELLED
    max_disqualified = loyalty.get("max_disqualified_orders", Settings.LOYALTY_MAX_DISQUALIFIED_ORDERS)
    if disqualified_count > 0 and disqualified_count >= max_disqualified:
        return LoyaltyStatus.CANCELLED
    if qualified_count >= loyalty.get("required_order_count", Settings.LOYALTY_REQUIRED_ORDER_COUNT):
        return LoyaltyStatus.ELIGIBLE
    return LoyaltyStatus.PENDING


def _refresh_summary(loyalty: dict):
    qualified_count, disqualified_count = _calculate_counts(loyalty.get("orders", []))
    loyalty["qualified_order_count"] = qualified_count
    loyalty["disqualified_order_count"] = disqualified_count
    next_status = _derive_status(loyalty, qualified_count, disqualified_count)
    loyalty["status"] = next_status.value if isinstance(next_status, LoyaltyStatus) else next_status

    if loyalty["status"] == LoyaltyStatus.CANCELLED:
        loyalty["cancel_reason"] = loyalty.get("cancel_reason") or "Too many returned/disqualified orders"

    return loyalty


async def _save_loyalty(loyalty: dict):
    loyalty["updated_at"] = datetime.now(UTC)
    await loyalty_collection.replace_one({"_id": loyalty["_id"]}, loyalty)
    return build_loyalty_response(loyalty)


async def add_loyalty_order(auth_user: dict, payload: dict):
    _can_mutate(auth_user)
    email = _normalize_email(payload.get("email"))
    ref_no = (payload.get("ref_no") or "").strip().upper()
    requested_order_id = _normalize_order_id(payload.get("order_id"))

    if not email and not ref_no:
        bad_request("Email or loyalty reference is required")

    sale = await _validate_sale_for_add(requested_order_id)
    order_id = _sale_order_id(sale)

    existing_order = await loyalty_collection.find_one({"orders.order_id": order_id})
    if existing_order:
        if (email and existing_order.get("email") == email) or (ref_no and existing_order.get("ref_no") == ref_no):
            bad_request("This order is already linked to this loyalty reference")
        bad_request("This order is already linked to another loyalty reference")

    loyalty = await loyalty_collection.find_one({"ref_no": ref_no}) if ref_no else None
    if not loyalty and email:
        loyalty = await _find_active_loyalty_by_email(email)

    if loyalty and email and loyalty.get("email") != email:
        bad_request("Email does not match this loyalty reference")

    if not loyalty and not email:
        bad_request("Email is required to create a new loyalty reference")

    now = datetime.now(UTC)
    created = False
    if not loyalty:
        ref_no = await _generate_ref_no()
        config = _config()
        loyalty = {
            "ref_no": ref_no,
            "email": email,
            "orders": [],
            "qualified_order_count": 0,
            "disqualified_order_count": 0,
            "required_order_count": config["required_order_count"],
            "max_disqualified_orders": config["max_disqualified_orders"],
            "discount_type": config["discount_type"],
            "discount_value": config["discount_value"],
            "max_redeem_amount": MAX_REDEEM_AMOUNT,
            "status": LoyaltyStatus.PENDING,
            "redeemed_order_id": None,
            "redeemed_amount": None,
            "redeemed_sale_amount": None,
            "redeemed_at": None,
            "cancel_reason": None,
            "notes": [],
            "created_by": auth_user.get("username"),
            "created_at": now,
            "updated_at": now,
        }
        created = True

    if loyalty.get("status") in TERMINAL_STATUSES:
        bad_request(f"Cannot add orders to a {loyalty.get('status')} loyalty reference")

    order_count = len(loyalty.get("orders", []))
    loyalty["orders"].append({
        "order_id": order_id,
        "sale_id": str(sale.get("_id")),
        "platform": sale.get("platform"),
        "sale_status": _sale_status(sale),
        "loyalty_status": QUALIFIED,
        "is_parent": order_count == 0,
        "added_at": now,
        "notes": payload.get("notes") or "Order qualified for loyalty program",
    })

    loyalty = _refresh_summary(loyalty)
    loyalty["notes"].append(_note(
        _progress_message(loyalty["qualified_order_count"], loyalty["required_order_count"]),
        auth_user,
    ))

    if created:
        result = await loyalty_collection.insert_one(loyalty)
        loyalty["_id"] = result.inserted_id
    else:
        await loyalty_collection.replace_one({"_id": loyalty["_id"]}, loyalty)

    await create_audit_log(
        module_name=AuditModule.LOYALTY,
        event_type=AuditEvent.CREATED if created else AuditEvent.UPDATED,
        reference_id=loyalty.get("ref_no"),
        performed_by=auth_user.get("username"),
        new_data={"email": email, "order_id": order_id, "status": loyalty.get("status")},
    )

    return build_loyalty_response(loyalty)


async def revalidate_loyalty_order(order_id: str, auth_user: dict | None = None):
    order_id = _normalize_order_id(order_id)
    if not order_id:
        return None

    loyalty = await loyalty_collection.find_one({"orders.order_id": order_id})
    if not loyalty or loyalty.get("status") in TERMINAL_STATUSES:
        return None

    sale = await _get_sale(order_id)
    if not sale:
        return None

    changed = False
    for order in loyalty.get("orders", []):
        if order.get("order_id") != order_id:
            continue
        next_sale_status = _sale_status(sale)
        order["sale_status"] = next_sale_status
        if next_sale_status != SOLD and order.get("loyalty_status") == QUALIFIED:
            order["loyalty_status"] = DISQUALIFIED
            order["notes"] = f"Order {order_id} was returned or changed to {next_sale_status} and no longer counts toward this offer."
            loyalty.setdefault("notes", []).append(_note(order["notes"], auth_user))
            changed = True

    if not changed:
        return None

    old_status = loyalty.get("status")
    loyalty = _refresh_summary(loyalty)
    if old_status == LoyaltyStatus.ELIGIBLE and loyalty.get("status") == LoyaltyStatus.PENDING:
        loyalty.setdefault("notes", []).append(_note(
            "Offer moved back to pending. Add another eligible order to unlock the loyalty offer.",
            auth_user,
        ))
    if loyalty.get("status") == LoyaltyStatus.CANCELLED:
        loyalty.setdefault("notes", []).append(_note(
            "Offer cancelled because more than the allowed linked orders were returned or disqualified.",
            auth_user,
        ))

    await loyalty_collection.replace_one({"_id": loyalty["_id"]}, loyalty)
    return build_loyalty_response(loyalty)


async def redeem_loyalty(auth_user: dict, payload: dict):
    _can_mutate(auth_user)
    loyalty = await _find_loyalty_by_email_or_ref(payload.get("email"), payload.get("ref_no"))
    loyalty = _refresh_summary(loyalty)

    if loyalty.get("status") != LoyaltyStatus.ELIGIBLE:
        bad_request("Loyalty offer is not eligible for redemption")

    order_id = _normalize_order_id(payload.get("order_id"))
    sale = await _validate_sale_for_add(order_id)
    redeem_order_id = _sale_order_id(sale)
    if await loyalty_collection.find_one({"orders.order_id": redeem_order_id}):
        bad_request("Redeem order is already linked to a loyalty reference")

    now = datetime.now(UTC)
    redeemed_sale_amount = round_price(float(sale.get("final_total_amount") or 0))
    redeemed_amount = _calculate_redeem_amount(loyalty, sale)
    loyalty["orders"].append({
        "order_id": redeem_order_id,
        "sale_id": str(sale.get("_id")),
        "platform": sale.get("platform"),
        "sale_status": _sale_status(sale),
        "loyalty_status": REDEEM_ORDER,
        "sale_amount": redeemed_sale_amount,
        "redeemed_amount": redeemed_amount,
        "is_parent": False,
        "added_at": now,
        "notes": payload.get("notes") or f"Loyalty offer redeemed with {redeemed_amount} cashback",
    })
    loyalty["status"] = LoyaltyStatus.REDEEMED
    loyalty["redeemed_order_id"] = redeem_order_id
    loyalty["redeemed_amount"] = redeemed_amount
    loyalty["redeemed_sale_amount"] = redeemed_sale_amount
    loyalty["redeemed_at"] = now
    loyalty.setdefault("notes", []).append(_note(
        f"Loyalty offer redeemed successfully on order {redeem_order_id}. {redeemed_amount} amount redeemed.",
        auth_user,
    ))

    await create_audit_log(
        module_name=AuditModule.LOYALTY,
        event_type=AuditEvent.UPDATED,
        reference_id=loyalty.get("ref_no"),
        performed_by=auth_user.get("username"),
        new_data={
            "redeemed_order_id": redeem_order_id,
            "redeemed_amount": redeemed_amount,
            "status": LoyaltyStatus.REDEEMED,
        },
    )

    return await _save_loyalty(loyalty)


async def cancel_loyalty(auth_user: dict, payload: dict):
    _can_mutate(auth_user)
    loyalty = await _find_loyalty_by_email_or_ref(payload.get("email"), payload.get("ref_no"))
    loyalty["status"] = LoyaltyStatus.CANCELLED
    loyalty["cancel_reason"] = payload.get("reason")
    loyalty.setdefault("notes", []).append(_note(
        f"Offer cancelled manually. Reason: {payload.get('reason')}",
        auth_user,
    ))

    await create_audit_log(
        module_name=AuditModule.LOYALTY,
        event_type=AuditEvent.UPDATED,
        reference_id=loyalty.get("ref_no"),
        performed_by=auth_user.get("username"),
        new_data={"status": LoyaltyStatus.CANCELLED, "reason": payload.get("reason")},
    )

    return await _save_loyalty(loyalty)


async def get_loyalty_records(
    auth_user: dict,
    email: str = None,
    ref_no: str = None,
    order_id: str = None,
    status: str = None,
    search: str = None,
    sort_by: str = "created_at",
    order: str = "desc",
    page: int = 1,
    limit: int = 10,
):
    _can_view(auth_user)
    validate_sort_field(sort_by, [
        "created_at",
        "updated_at",
        "email",
        "ref_no",
        "status",
        "qualified_order_count",
        "disqualified_order_count",
    ])

    filters = {}
    if email:
        filters["email"] = _normalize_email(email)
    if ref_no:
        filters["ref_no"] = ref_no.strip().upper()
    if order_id:
        filters["orders.order_id"] = _normalize_order_id(order_id)
    if status:
        filters["status"] = status

    search_filter = regex_filter(search, [
        "email",
        "ref_no",
        "status",
        "orders.order_id",
        "orders.platform",
        "notes.message",
    ])
    if search_filter:
        filters = {"$and": [filters, search_filter]} if filters else search_filter

    return await paginate_collection(
        loyalty_collection,
        filters,
        sort_by,
        order,
        page,
        limit,
        build_loyalty_response,
    )
