import hmac
import secrets
from datetime import datetime, UTC, timedelta
from pathlib import Path
from uuid import uuid4

from fastapi import UploadFile

from app.services.auth_service import bcrypt_context
from app.services.email_service import send_email_verification_otp
from app.services.password_reset_service import _secret_hash, _utc_naive

from app.database.mongodb import db
from app.utils.helpers import (
    hash_password,
    normalize_username
)
from app.utils.pagination import paginate_collection, regex_filter, validate_sort_field
from app.utils.responseBuilder import build_user_response
from app.utils.settings import Settings
from app.services.supplier_service import OWN_COMPANY_SUPPLIER_KEY

from app.models.auth import UserRole
from app.utils.messages import Messages
from app.core.exceptions import (
    forbidden,
    conflict,
    not_found,
    bad_request
)

user_collection = db.users
password_otps_collection = db.password_otps
EMAIL_VERIFICATION_PURPOSE = "EMAIL_VERIFICATION"
ALLOWED_IMAGE_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
}
UPLOAD_DIR = Path(Settings.UPLOAD_DIR)


def _delete_uploaded_file(url: str):
    if not url or not url.startswith("/uploads/"):
        return

    target = (UPLOAD_DIR / url.removeprefix("/uploads/")).resolve()
    upload_root = UPLOAD_DIR.resolve()
    try:
        target.relative_to(upload_root)
    except ValueError:
        return

    if target.is_file():
        target.unlink()

SUPERADMIN_CLEANABLE_COLLECTIONS = {
    "api-logs": db.api_logs,
    "audits": db.audits,
    "company-settings": db.company_settings,
    "exchanges": db.exchanges,
    "loyalty": db.loyalty,
    "manufacturing": db.manufacturing,
    "notification-reads": db.notification_reads,
    "notifications": db.notifications,
    "otp-records": db.password_otps,
    "products": db.products,
    "purchases": db.purchases,
    "returns": db.returns,
    "sales": db.sales,
    "stocks": db.stocks,
    "suppliers": db.suppliers,
    "users": db.users,
}

# CREATE USER


async def create_user(auth_user: dict, user_data: dict):
    username = normalize_username(user_data.get("username"))
    email = user_data.get("email", "").strip().lower()

    if auth_user.get("role") != UserRole.SUPERADMIN:
        forbidden()

    # Check duplicate username
    existing_user = await user_collection.find_one({
        "username": username
    })

    if existing_user:
        conflict(Messages.USER_ALREADY_PRESENT)

    existing_email = await user_collection.find_one({
        "email": email
    })

    if existing_email:
        conflict(Messages.USER_ALREADY_PRESENT)

    user_data["username"] = username
    user_data["email"] = email
    user_data["firstname"] = user_data.get("firstname", "").strip().title()
    user_data["lastname"] = (user_data.get("lastname") or "").strip().title()
    user_data["created_at"] = datetime.now(UTC)
    user_data["updated_at"] = datetime.now(UTC)
    user_data["active"] = user_data.get("active", True)
    user_data["email_verified"] = False
    user_data["password"] = hash_password(user_data.get("password"))

    result = await user_collection.insert_one(user_data)

    created_user = await user_collection.find_one({
        "_id": result.inserted_id
    })

    return build_user_response(created_user)


# GET USER BY USERNAME
async def get_user_by_username(auth_user: dict, username: str):

    username = normalize_username(username)

    # USER ROLE VALIDATION
    if auth_user.get("role") == UserRole.USER:

        if auth_user.get("username") != username:
            forbidden()

    user = await user_collection.find_one({
        "username": username
    })

    if not user:
        not_found(Messages.USER_NOT_FOUND)

    # SUPERADMIN
    if auth_user.get("role") == UserRole.SUPERADMIN:
        return build_user_response(user)

    # ADMIN
    if auth_user.get("role") == UserRole.ADMIN:

        # own profile
        if auth_user.get("username") == username:
            return build_user_response(user)

        # only active USER accounts allowed
        if (
            user.get("role") != UserRole.USER
            or not user.get("active")
        ):
            forbidden()

        return build_user_response(user)

    # USER
    return build_user_response(user)


# GET ME

async def get_me(auth_user: dict):
    if not auth_user:
        forbidden()
    username = normalize_username(auth_user.get("username"))
    user = await user_collection.find_one({
        "username": username
    })
    return build_user_response(user)

# GET ALL USERS


async def get_all_users(
    auth_user: dict,
    search: str = None,
    sort_by: str = "created_at",
    order: str = "desc",
    page: int = 1,
    limit: int = 10,
):

    allowed_sort_fields = [
        "created_at",
        "updated_at",
        "username",
        "firstname",
        "lastname",
        "email",
        "role",
        "active",
    ]
    validate_sort_field(sort_by, allowed_sort_fields)
    # superadmin can view all users including inactive users, superadmin and admin users
    # admin can view only active users and cannot view other admin and superadmin users, also can view own details
    # users cannot view all users.

    if auth_user.get("role") == UserRole.SUPERADMIN:
        filters = {}

    elif auth_user.get("role") == UserRole.ADMIN:
        filters = {
            "$or": [
                {
                    "username": auth_user.get("username")
                },
                {
                    "active": True,
                    "role": UserRole.USER
                }
            ]
        }
    else:
        forbidden()

    search_filter = regex_filter(search, [
        "username",
        "firstname",
        "lastname",
        "email",
        "role",
    ])
    if search_filter:
        filters = {"$and": [filters, search_filter]} if filters else search_filter

    return await paginate_collection(
        user_collection,
        filters,
        sort_by,
        order,
        page,
        limit,
        build_user_response,
    )

# DELETE USER SOFT AND PERMANENT


async def activate_user(auth_user: dict, username: str):
    username = normalize_username(username)

    if auth_user.get("role") != UserRole.SUPERADMIN:
        forbidden()

    existing_user = await user_collection.find_one({
        "username": username,
    })

    if not existing_user:
        not_found(Messages.USER_NOT_FOUND)

    if existing_user.get("active"):
        bad_request(Messages.ACCESS_DENIED)

    await user_collection.update_one({
        "username": username
    }, {
        "$set": {
            "active": True,
            "updated_at": datetime.now(UTC)
        }
    })

    updated_user = await user_collection.find_one({
        "username": username
    })

    return build_user_response(updated_user)


async def delete_user(auth_user: dict, username: str, permanent: bool = False):
    # only superadmin can delete users, no other role can delete
    username = normalize_username(username)

    if auth_user.get("role") != UserRole.SUPERADMIN:
        forbidden()

    existing_user = await user_collection.find_one({
        "username": username,
    })

    if not existing_user:
        not_found(Messages.USER_NOT_FOUND)

    # PREVENT SELF DELETE
    if auth_user.get("username") == username:
        bad_request(Messages.USER_SELF_DELETE_NOT_ALLOWED)

    # PREVENT SUPERADMIN DELETE
    if existing_user.get("role") == UserRole.SUPERADMIN:
        bad_request(Messages.SUPERADMIN_DELETE_NOT_ALLOWED)

    if permanent:
        if existing_user.get("active"):
            bad_request(Messages.USER_DEACTIVATION_REQUIRED)

        await user_collection.delete_one({
            "username": username
        })

        return Messages.USER_DELETED_PERMANENTLY

    if not existing_user.get("active"):
        bad_request(Messages.USER_INACTIVE)

    await user_collection.update_one({
        "username": username
    }, {
        "$set": {
            "active": False,
            "updated_at": datetime.now(UTC)
        }
    })
    return Messages.USER_DELETED


async def update_user_role(auth_user: dict, username: str, role: UserRole):
    username = normalize_username(username)

    if auth_user.get("role") != UserRole.SUPERADMIN:
        forbidden()

    if auth_user.get("username") == username:
        bad_request(Messages.ACCESS_DENIED)

    existing_user = await user_collection.find_one({
        "username": username
    })

    if not existing_user:
        not_found(Messages.USER_NOT_FOUND)

    if not existing_user.get("active"):
        bad_request(Messages.USER_INACTIVE)

    if existing_user.get("role") == UserRole.SUPERADMIN and role != UserRole.SUPERADMIN:
        superadmin_count = await user_collection.count_documents({
            "role": UserRole.SUPERADMIN,
            "active": True
        })
        if superadmin_count <= 1:
            bad_request(Messages.ACCESS_DENIED)

    await user_collection.update_one({
        "username": username
    }, {
        "$set": {
            "role": role,
            "updated_at": datetime.now(UTC)
        }
    })

    updated_user = await user_collection.find_one({
        "username": username
    })

    return build_user_response(updated_user)


async def clean_database_collections(auth_user: dict, collections: list[str]):
    if auth_user.get("role") != UserRole.SUPERADMIN:
        forbidden()

    selected_collections = list(dict.fromkeys(collections))
    invalid_collections = [
        collection for collection in selected_collections
        if collection not in SUPERADMIN_CLEANABLE_COLLECTIONS
    ]

    if invalid_collections:
        bad_request(Messages.INVALID_COLLECTION)

    result = {}

    for collection_name in selected_collections:
        collection = SUPERADMIN_CLEANABLE_COLLECTIONS[collection_name]

        if collection_name == "users":
            delete_result = await collection.delete_many({
                "username": {"$ne": auth_user.get("username")}
            })
        elif collection_name == "suppliers":
            delete_result = await collection.delete_many({
                "$and": [
                    {"is_own_company": {"$ne": True}},
                    {"system_key": {"$ne": OWN_COMPANY_SUPPLIER_KEY}},
                ]
            })
        else:
            delete_result = await collection.delete_many({})

        result[collection_name] = delete_result.deleted_count

        if collection_name == "notifications":
            read_delete_result = await db.notification_reads.delete_many({})
            result["notification_reads"] = read_delete_result.deleted_count

    return result


async def change_password(auth_user: dict, current_password: str, new_password: str):
    username = normalize_username(auth_user.get("username"))
    user = await user_collection.find_one({
        "username": username,
        "active": True,
    })

    if not user:
        not_found(Messages.USER_NOT_FOUND)

    if not bcrypt_context.verify(current_password, user.get("password", "")):
        bad_request(Messages.CURRENT_PASSWORD_INVALID)

    if bcrypt_context.verify(new_password, user.get("password", "")):
        bad_request(Messages.NEW_PASSWORD_SAME_AS_CURRENT)

    await user_collection.update_one(
        {"username": username},
        {
            "$set": {
                "password": hash_password(new_password),
                "updated_at": datetime.now(UTC),
            }
        },
    )

    return {"updated": True}


async def update_my_profile(auth_user: dict, profile_data: dict):
    username = normalize_username(auth_user.get("username"))
    user = await user_collection.find_one({"username": username, "active": True})
    if not user:
        not_found(Messages.USER_NOT_FOUND)

    email = (profile_data.get("email") or "").strip().lower()
    existing_email = await user_collection.find_one({
        "email": email,
        "username": {"$ne": username},
    })
    if existing_email:
        conflict(Messages.USER_ALREADY_PRESENT)

    email_changed = email != (user.get("email") or "").lower()
    update_data = {
        "firstname": (profile_data.get("firstname") or "").strip().title(),
        "lastname": (profile_data.get("lastname") or "").strip().title(),
        "email": email,
        "updated_at": datetime.now(UTC),
    }
    if email_changed:
        update_data["email_verified"] = False

    await user_collection.update_one(
        {"username": username},
        {"$set": update_data},
    )

    updated_user = await user_collection.find_one({"username": username})
    return build_user_response(updated_user)


async def update_my_profile_image(auth_user: dict, file: UploadFile):
    username = normalize_username(auth_user.get("username"))
    user = await user_collection.find_one({"username": username, "active": True})
    if not user:
        not_found(Messages.USER_NOT_FOUND)

    extension = ALLOWED_IMAGE_TYPES.get(file.content_type)
    if not extension:
        bad_request("Only JPG, PNG, WEBP, or GIF images are allowed")

    contents = await file.read()
    if len(contents) > 2 * 1024 * 1024:
        bad_request("Image size must be 2MB or less")

    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    filename = f"user-profile-{username}-{uuid4().hex}{extension}"
    target = UPLOAD_DIR / filename
    target.write_bytes(contents)

    await user_collection.update_one(
        {"username": username},
        {
            "$set": {
                "profile_image_url": f"/uploads/{filename}",
                "updated_at": datetime.now(UTC),
            }
        },
    )

    updated_user = await user_collection.find_one({"username": username})
    return build_user_response(updated_user)


async def reset_my_profile_image(auth_user: dict):
    username = normalize_username(auth_user.get("username"))
    user = await user_collection.find_one({"username": username, "active": True})
    if not user:
        not_found(Messages.USER_NOT_FOUND)

    _delete_uploaded_file(user.get("profile_image_url", ""))

    await user_collection.update_one(
        {"username": username},
        {
            "$set": {
                "profile_image_url": "",
                "updated_at": datetime.now(UTC),
            }
        },
    )

    updated_user = await user_collection.find_one({"username": username})
    return build_user_response(updated_user)


async def _latest_pending_email_otp(user_id: str):
    cursor = password_otps_collection.find({
        "user_id": user_id,
        "purpose": EMAIL_VERIFICATION_PURPOSE,
        "status": "PENDING",
    }).sort("created_at", -1).limit(1)
    docs = await cursor.to_list(length=1)
    return docs[0] if docs else None


async def request_email_verification(auth_user: dict):
    username = normalize_username(auth_user.get("username"))
    user = await user_collection.find_one({"username": username, "active": True})
    if not user:
        not_found(Messages.USER_NOT_FOUND)

    if user.get("email_verified"):
        return {"sent": False, "verified": True}

    now = datetime.now(UTC).replace(tzinfo=None)
    user_id = str(user.get("_id"))
    pending = await _latest_pending_email_otp(user_id)
    if pending and pending.get("last_sent_at"):
        elapsed = (now - _utc_naive(pending.get("last_sent_at"))).total_seconds()
        if elapsed < 60:
            bad_request(Messages.OTP_RESEND_TOO_SOON)

    await password_otps_collection.update_many(
        {
            "user_id": user_id,
            "purpose": EMAIL_VERIFICATION_PURPOSE,
            "status": "PENDING",
        },
        {"$set": {"status": "EXPIRED", "updated_at": now}},
    )

    otp = f"{secrets.randbelow(1_000_000):06d}"
    await password_otps_collection.insert_one({
        "user_id": user_id,
        "username": user.get("username"),
        "email": user.get("email"),
        "purpose": EMAIL_VERIFICATION_PURPOSE,
        "otp_hash": _secret_hash(otp),
        "status": "PENDING",
        "expires_at": now + timedelta(minutes=10),
        "attempts": 0,
        "max_attempts": 5,
        "last_sent_at": now,
        "created_at": now,
        "updated_at": now,
    })

    await send_email_verification_otp(user.get("email"), otp)
    return {"sent": True, "verified": False}


async def verify_email(auth_user: dict, otp: str):
    username = normalize_username(auth_user.get("username"))
    user = await user_collection.find_one({"username": username, "active": True})
    if not user:
        not_found(Messages.USER_NOT_FOUND)

    now = datetime.now(UTC).replace(tzinfo=None)
    record = await _latest_pending_email_otp(str(user.get("_id")))
    if not record or _utc_naive(record.get("expires_at")) <= now:
        bad_request(Messages.INVALID_OTP)

    if not hmac.compare_digest(record.get("otp_hash", ""), _secret_hash((otp or "").strip())):
        attempts = int(record.get("attempts", 0)) + 1
        max_attempts = int(record.get("max_attempts", 5))
        is_blocked = attempts >= max_attempts
        status = "BLOCKED" if is_blocked else "PENDING"
        await password_otps_collection.update_one(
            {"_id": record.get("_id")},
            {"$set": {"attempts": attempts, "status": status, "updated_at": now}},
        )
        if is_blocked:
            await user_collection.update_one(
                {"username": username},
                {"$set": {"active": False, "updated_at": datetime.now(UTC)}},
            )
            bad_request(Messages.OTP_USER_BLOCKED)
        remaining = max(max_attempts - attempts, 0)
        bad_request(Messages.OTP_INVALID_WITH_ATTEMPTS.format(remaining=remaining))

    await user_collection.update_one(
        {"username": username},
        {"$set": {"email_verified": True, "updated_at": datetime.now(UTC)}},
    )
    await password_otps_collection.update_one(
        {"_id": record.get("_id")},
        {"$set": {"status": "USED", "used_at": now, "updated_at": now}},
    )
    updated_user = await user_collection.find_one({"username": username})
    return build_user_response(updated_user)
