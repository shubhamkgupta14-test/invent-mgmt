from datetime import datetime, UTC
from bson import ObjectId

from app.core.exceptions import bad_request, forbidden, not_found
from app.database.mongodb import db
from app.models.auth import UserRole
from app.models.notification import NotificationAudience, NotificationType
from app.utils.helpers import normalize_username

notifications_collection = db.notifications
notification_reads_collection = db.notification_reads
users_collection = db.users


def _serialize_notification(notification: dict, read_ids: set[str] = None):
    read_ids = read_ids or set()
    notification_id = str(notification.get("_id"))
    return {
        "notification_id": notification_id,
        "title": notification.get("title"),
        "message": notification.get("message"),
        "notification_type": notification.get("notification_type"),
        "audience": notification.get("audience"),
        "roles": notification.get("roles", []),
        "usernames": notification.get("usernames", []),
        "created_by": notification.get("created_by"),
        "created_at": notification.get("created_at").isoformat(),
        "read": notification_id in read_ids,
    }


def _enum_value(value):
    return value.value if hasattr(value, "value") else value


def _sentence_case(value: str):
    text = (value or "").strip().lower()
    if not text:
        return ""
    return text[0].upper() + text[1:]


def _target_filter(auth_user: dict):
    username = normalize_username(auth_user.get("username"))
    role = auth_user.get("role")
    return {
        "$or": [
            {"audience": NotificationAudience.ALL.value},
            {"audience": NotificationAudience.ROLE.value, "roles": role},
            {"audience": NotificationAudience.USERS.value, "usernames": username},
        ]
    }


async def create_notification(auth_user: dict, notification_data: dict):
    if auth_user.get("role") != UserRole.SUPERADMIN:
        forbidden()

    audience = _enum_value(notification_data.get("audience"))
    roles = notification_data.get("roles") or []
    roles = [_enum_value(role) for role in roles]
    usernames = [
        normalize_username(username)
        for username in notification_data.get("usernames", [])
        if username
    ]

    if audience == NotificationAudience.ROLE and not roles:
        bad_request("At least one role is required")
    if audience == NotificationAudience.USERS and not usernames:
        bad_request("At least one username is required")

    document = {
        "title": _sentence_case(notification_data.get("title")),
        "message": notification_data.get("message").strip(),
        "notification_type": _enum_value(notification_data.get("notification_type")),
        "audience": audience,
        "roles": roles,
        "usernames": usernames,
        "created_by": auth_user.get("username"),
        "system_generated": False,
        "created_at": datetime.now(UTC),
        "updated_at": datetime.now(UTC),
    }

    result = await notifications_collection.insert_one(document)
    created = await notifications_collection.find_one({"_id": result.inserted_id})
    return _serialize_notification(created)


async def create_system_out_of_stock_notification(
    sku: str,
    name: str,
    supplier_name: str = "-"
):
    await notifications_collection.insert_one({
        "title": _sentence_case(f"{name or 'Product'} has reached zero inventory."),
       "message": (
            f"Product Name: {name or 'Product'}\n"
            f"SKU: {sku}\n\n"
            "Current Quantity: 0\n\n"
            f"Supplier: {supplier_name or '-'}\n\n"
            "Please create a purchase order to replenish stock."
        ),
        "notification_type": NotificationType.OUT_OF_STOCK.value,
        "audience": NotificationAudience.ALL.value,
        "roles": [],
        "usernames": [],
        "created_by": "SYSTEM",
        "system_generated": True,
        "created_at": datetime.now(UTC),
        "updated_at": datetime.now(UTC),
    })


async def get_my_notifications(auth_user: dict, limit: int = 20, unread_only: bool = False):
    query = _target_filter(auth_user)
    read_records = await notification_reads_collection.find({
        "username": normalize_username(auth_user.get("username"))
    }).to_list(length=None)
    read_ids = {record.get("notification_id") for record in read_records}
    read_object_ids = [
        ObjectId(item)
        for item in read_ids
        if ObjectId.is_valid(item)
    ]
    unread_query = query
    if read_object_ids:
        unread_query = {
            "$and": [
                query,
                {"_id": {"$nin": read_object_ids}},
            ]
        }
    fetch_query = unread_query if unread_only else query

    notifications = []
    async for notification in notifications_collection.find(fetch_query).sort("created_at", -1).limit(limit):
        serialized = _serialize_notification(notification, read_ids)
        notifications.append(serialized)

    unread_count = await notifications_collection.count_documents(unread_query)
    return {
        "notifications": notifications,
        "unread_count": unread_count,
    }


async def get_all_notifications(auth_user: dict):
    if auth_user.get("role") != UserRole.SUPERADMIN:
        forbidden()

    notifications = []
    async for notification in notifications_collection.find().sort("created_at", -1):
        notifications.append(_serialize_notification(notification))
    return notifications


async def resend_notification(auth_user: dict, notification_id: str):
    if auth_user.get("role") != UserRole.SUPERADMIN:
        forbidden()

    if not ObjectId.is_valid(notification_id):
        bad_request("Invalid notification id")

    notification = await notifications_collection.find_one({
        "_id": ObjectId(notification_id)
    })
    if not notification:
        not_found("Notification not found")

    return await create_notification(auth_user, {
        "title": notification.get("title"),
        "message": notification.get("message"),
        "notification_type": notification.get("notification_type"),
        "audience": notification.get("audience"),
        "roles": notification.get("roles", []),
        "usernames": notification.get("usernames", []),
    })


async def mark_notification_read(auth_user: dict, notification_id: str):
    if not ObjectId.is_valid(notification_id):
        bad_request("Invalid notification id")

    notification = await notifications_collection.find_one({
        "_id": ObjectId(notification_id),
        **_target_filter(auth_user),
    })
    if not notification:
        not_found("Notification not found")

    await notification_reads_collection.update_one(
        {
            "notification_id": notification_id,
            "username": normalize_username(auth_user.get("username")),
        },
        {
            "$set": {
                "notification_id": notification_id,
                "username": normalize_username(auth_user.get("username")),
                "read_at": datetime.now(UTC),
            }
        },
        upsert=True,
    )

    return {"notification_id": notification_id, "read": True}


async def mark_all_notifications_read(auth_user: dict):
    username = normalize_username(auth_user.get("username"))
    read_at = datetime.now(UTC)
    read_records = await notification_reads_collection.find({
        "username": username
    }).to_list(length=None)
    read_ids = {record.get("notification_id") for record in read_records}

    marked_count = 0
    async for notification in notifications_collection.find(_target_filter(auth_user)):
        notification_id = str(notification.get("_id"))
        if notification_id in read_ids:
            continue

        await notification_reads_collection.update_one(
            {
                "notification_id": notification_id,
                "username": username,
            },
            {
                "$set": {
                    "notification_id": notification_id,
                    "username": username,
                    "read_at": read_at,
                }
            },
            upsert=True,
        )
        marked_count += 1

    return {"marked_count": marked_count}


async def delete_notification(auth_user: dict, notification_id: str):
    if auth_user.get("role") != UserRole.SUPERADMIN:
        forbidden()

    if not ObjectId.is_valid(notification_id):
        bad_request("Invalid notification id")

    result = await notifications_collection.delete_one({
        "_id": ObjectId(notification_id)
    })
    if result.deleted_count == 0:
        not_found("Notification not found")

    await notification_reads_collection.delete_many({
        "notification_id": notification_id
    })

    return {"notification_id": notification_id}
