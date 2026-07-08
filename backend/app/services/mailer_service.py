from datetime import datetime, UTC, timedelta

from bson import ObjectId
from pymongo import ReturnDocument

from app.core.exceptions import bad_request, not_found
from app.database.mongodb import db
from app.services.company_service import get_company_brand_name
from app.utils.helpers import format_datetime_iso, normalize_username
from app.utils.settings import Settings

mail_collection = db.mail_messages
users_collection = db.users


def _retention_days():
    return 30 if Settings.ENVIRONMENT.lower() == "prod" else 1


def _expiry_date(now=None):
    now = now or datetime.now(UTC)
    return now + timedelta(days=_retention_days())


def _display_name(user: dict):
    if not user:
        return ""
    name = " ".join(
        part for part in [user.get("firstname"), user.get("lastname")] if part
    ).strip()
    return name or user.get("username", "")


def _serialize_message(message: dict):
    return {
        "message_id": str(message.get("_id")),
        "owner_username": message.get("owner_username"),
        "folder": message.get("folder", "inbox"),
        "from_username": message.get("from_username"),
        "from_name": message.get("from_name"),
        "from_email": message.get("from_email"),
        "to_username": message.get("to_username"),
        "to_usernames": message.get("to_usernames", []),
        "to_name": message.get("to_name"),
        "to_email": message.get("to_email"),
        "to_names": message.get("to_names", []),
        "subject": message.get("subject"),
        "body": message.get("body"),
        "html_body": message.get("html_body", ""),
        "signature": message.get("signature", ""),
        "system_generated": message.get("system_generated", False),
        "read": message.get("read", False),
        "starred": message.get("starred", False),
        "created_at": format_datetime_iso(message.get("created_at")),
        "read_at": format_datetime_iso(message.get("read_at")) if message.get("read_at") else None,
    }


async def _find_active_user(identifier: str):
    value = (identifier or "").strip().lower()
    if not value:
        return None
    return await users_collection.find_one({
        "active": True,
        "$or": [
            {"username": normalize_username(value)},
            {"email": value},
        ],
    })


def _split_recipients(value: str):
    recipients = []
    seen = set()
    for item in (value or "").split(","):
        recipient = item.strip().lower()
        if not recipient or recipient in seen:
            continue
        recipients.append(recipient)
        seen.add(recipient)
    return recipients


async def build_default_signature(auth_user: dict):
    username = normalize_username(auth_user.get("username"))
    user = await users_collection.find_one({"username": username}) or auth_user
    brand_name = await get_company_brand_name()
    name = _display_name(user)
    role = str(user.get("role") or "").title()
    email = user.get("email") or ""

    return {
        "name": name,
        "role": role,
        "phone": user.get("phone") or "",
        "email": email,
        "brand_name": brand_name,
        "text": "\n".join(
            line for line in [
                name,
                role,
                " | ".join(part for part in [user.get("phone") or "", email] if part),
                brand_name,
            ] if line
        ),
    }


async def _create_system_not_found_mail(sender: dict, requested_to: str):
    now = datetime.now(UTC)
    brand_name = await get_company_brand_name()
    sender_username = normalize_username(sender.get("username"))
    sender_user = await users_collection.find_one({"username": sender_username}) or sender

    document = {
        "from_username": "system",
        "from_name": f"{brand_name} Mailer",
        "from_email": "",
        "owner_username": sender_username,
        "folder": "inbox",
        "to_username": sender_username,
        "to_name": _display_name(sender_user),
        "to_email": sender_user.get("email", ""),
        "subject": "Username not found",
        "body": (
            "Your mail could not be delivered to the following recipient"
            f"{'s' if ',' in requested_to else ''} because they were not found "
            "as active application users:\n\n"
            f"{requested_to}\n\n"
            "Please check the username or email and try again."
        ),
        "signature": brand_name,
        "system_generated": True,
        "read": False,
        "starred": False,
        "created_at": now,
        "updated_at": now,
        "expire_at": _expiry_date(now),
    }
    result = await mail_collection.insert_one(document)
    created = await mail_collection.find_one({"_id": result.inserted_id})
    return _serialize_message(created)


async def send_mail(auth_user: dict, mail_data: dict):
    sender_username = normalize_username(auth_user.get("username"))
    sender = await users_collection.find_one({"username": sender_username})
    if not sender or not sender.get("active", True):
        bad_request("Sender account is not active")

    requested_recipients = _split_recipients(mail_data.get("to"))
    if not requested_recipients:
        bad_request("At least one recipient is required")
    if len(requested_recipients) > 25:
        bad_request("Maximum 25 recipients are allowed")

    recipients = []
    missing_recipients = []
    seen_usernames = set()
    for requested_recipient in requested_recipients:
        recipient = await _find_active_user(requested_recipient)
        if not recipient:
            missing_recipients.append(requested_recipient)
            continue
        if recipient.get("username") in seen_usernames:
            continue
        recipients.append(recipient)
        seen_usernames.add(recipient.get("username"))

    system_message = None
    if missing_recipients:
        system_message = await _create_system_not_found_mail(
            auth_user,
            ", ".join(missing_recipients),
        )

    if not recipients:
        return {
            "delivered": False,
            "delivered_count": 0,
            "missing_recipients": missing_recipients,
            "messages": [],
            "system_message": system_message,
        }

    now = datetime.now(UTC)
    signature = await build_default_signature(auth_user)
    signature_text = "" if mail_data.get("suppress_signature") else signature.get("text", "")
    documents = []
    for recipient in recipients:
        documents.append({
            "owner_username": recipient.get("username"),
            "folder": "inbox",
            "from_username": sender_username,
            "from_name": _display_name(sender),
            "from_email": sender.get("email", ""),
            "to_username": recipient.get("username"),
            "to_name": _display_name(recipient),
            "to_email": recipient.get("email", ""),
            "subject": (mail_data.get("subject") or "").strip(),
            "body": (mail_data.get("body") or "").strip(),
            "signature": signature_text,
            "system_generated": False,
            "read": False,
            "starred": False,
            "created_at": now,
            "updated_at": now,
            "expire_at": _expiry_date(now),
        })

    documents.append({
        "owner_username": sender_username,
        "folder": "sent",
        "from_username": sender_username,
        "from_name": _display_name(sender),
        "from_email": sender.get("email", ""),
        "to_username": recipients[0].get("username") if len(recipients) == 1 else "",
        "to_usernames": [recipient.get("username") for recipient in recipients],
        "to_name": _display_name(recipients[0]) if len(recipients) == 1 else "",
        "to_names": [_display_name(recipient) for recipient in recipients],
        "to_email": recipients[0].get("email", "") if len(recipients) == 1 else "",
        "subject": (mail_data.get("subject") or "").strip(),
        "body": (mail_data.get("body") or "").strip(),
        "signature": signature_text,
        "system_generated": False,
        "read": True,
        "starred": False,
        "created_at": now,
        "updated_at": now,
        "expire_at": _expiry_date(now),
    })

    result = await mail_collection.insert_many(documents)
    created_messages = []
    async for created in mail_collection.find({"_id": {"$in": result.inserted_ids}}):
        created_messages.append(_serialize_message(created))

    return {
        "delivered": True,
        "delivered_count": len(created_messages),
        "missing_recipients": missing_recipients,
        "messages": created_messages,
        "system_message": system_message,
    }


async def get_my_mail(
    auth_user: dict,
    search: str = None,
    starred: bool = False,
    folder: str = "inbox",
):
    username = normalize_username(auth_user.get("username"))
    if folder not in ["inbox", "sent", "all"]:
        bad_request("Invalid mail folder")

    if folder == "all":
        folder_query = {
            "$or": [
                {"owner_username": username},
                {"to_username": username, "owner_username": {"$exists": False}},
                {"from_username": username, "owner_username": {"$exists": False}},
            ]
        }
    elif folder == "sent":
        folder_query = {
            "$or": [
                {"owner_username": username, "folder": "sent"},
                {"from_username": username, "owner_username": {"$exists": False}},
            ]
        }
    else:
        folder_query = {
            "$or": [
                {"owner_username": username, "folder": "inbox"},
                {"to_username": username, "owner_username": {"$exists": False}},
            ]
        }

    conditions = [folder_query]
    if starred:
        conditions.append({"starred": True})
    if search:
        search_regex = {"$regex": search.strip(), "$options": "i"}
        conditions.append({"$or": [
            {"subject": search_regex},
            {"body": search_regex},
            {"from_username": search_regex},
            {"from_name": search_regex},
            {"from_email": search_regex},
            {"to_username": search_regex},
            {"to_usernames": search_regex},
            {"to_name": search_regex},
            {"to_names": search_regex},
            {"to_email": search_regex},
        ]})

    query = {"$and": conditions} if len(conditions) > 1 else conditions[0]

    messages = []
    async for message in mail_collection.find(query).sort("created_at", -1):
        messages.append(_serialize_message(message))

    unread_count = await mail_collection.count_documents({
        "$or": [
            {"owner_username": username, "folder": "inbox"},
            {"to_username": username, "owner_username": {"$exists": False}},
        ],
        "read": False,
    })
    return {
        "messages": messages,
        "unread_count": unread_count,
        "retention_days": _retention_days(),
    }


async def mark_mail_read(auth_user: dict, message_id: str):
    if not ObjectId.is_valid(message_id):
        bad_request("Invalid mail id")

    result = await mail_collection.find_one_and_update(
        {
            "_id": ObjectId(message_id),
            "$or": [
                {"owner_username": normalize_username(auth_user.get("username"))},
                {
                    "to_username": normalize_username(auth_user.get("username")),
                    "owner_username": {"$exists": False},
                },
            ],
        },
        {
            "$set": {
                "read": True,
                "read_at": datetime.now(UTC),
                "updated_at": datetime.now(UTC),
            }
        },
        return_document=ReturnDocument.AFTER,
    )
    if not result:
        not_found("Mail not found")
    return _serialize_message(result)


async def update_mail_star(auth_user: dict, message_id: str, starred: bool):
    if not ObjectId.is_valid(message_id):
        bad_request("Invalid mail id")

    now = datetime.now(UTC)
    update = {
        "$set": {
            "starred": starred,
            "updated_at": now,
        }
    }
    if starred:
        update["$unset"] = {"expire_at": ""}
    else:
        update["$set"]["expire_at"] = _expiry_date(now)

    result = await mail_collection.find_one_and_update(
        {
            "_id": ObjectId(message_id),
            "$or": [
                {"owner_username": normalize_username(auth_user.get("username"))},
                {
                    "to_username": normalize_username(auth_user.get("username")),
                    "owner_username": {"$exists": False},
                },
            ],
        },
        update,
        return_document=ReturnDocument.AFTER,
    )
    if not result:
        not_found("Mail not found")
    return _serialize_message(result)


async def delete_mail(auth_user: dict, message_id: str):
    if not ObjectId.is_valid(message_id):
        bad_request("Invalid mail id")

    result = await mail_collection.delete_one({
        "_id": ObjectId(message_id),
        "$or": [
            {"owner_username": normalize_username(auth_user.get("username"))},
            {
                "to_username": normalize_username(auth_user.get("username")),
                "owner_username": {"$exists": False},
            },
        ],
    })
    if result.deleted_count == 0:
        not_found("Mail not found")
    return {"message_id": message_id}


async def bulk_delete_mail(auth_user: dict, message_ids: list[str]):
    object_ids = []
    for message_id in message_ids:
        if not ObjectId.is_valid(message_id):
            bad_request("Invalid mail id")
        object_ids.append(ObjectId(message_id))

    result = await mail_collection.delete_many({
        "_id": {"$in": object_ids},
        "$or": [
            {"owner_username": normalize_username(auth_user.get("username"))},
            {
                "to_username": normalize_username(auth_user.get("username")),
                "owner_username": {"$exists": False},
            },
        ],
    })
    return {
        "deleted_count": result.deleted_count,
        "message_ids": message_ids,
    }
