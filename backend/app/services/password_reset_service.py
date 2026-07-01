import hashlib
import hmac
import secrets
from datetime import UTC, datetime, timedelta

from app.core.exceptions import bad_request
from app.database.mongodb import db
from app.models.auth import UserRole
from app.services.email_service import send_password_reset_otp
from app.utils.helpers import hash_password, normalize_username
from app.utils.messages import Messages
from app.utils.settings import Settings

users_collection = db.users
password_otps_collection = db.password_otps

OTP_PURPOSE_PASSWORD_RESET = "PASSWORD_RESET"
OTP_STATUS_PENDING = "PENDING"
OTP_STATUS_USED = "USED"
OTP_STATUS_EXPIRED = "EXPIRED"
OTP_STATUS_BLOCKED = "BLOCKED"


def _now():
    return datetime.now(UTC).replace(tzinfo=None)


def _utc_naive(value):
    if not value:
        return None
    if value.tzinfo:
        return value.astimezone(UTC).replace(tzinfo=None)
    return value


def _secret_hash(value: str):
    return hmac.new(
        Settings.SECRET_KEY.encode("utf-8"),
        value.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()


def _normalize_identifier(identifier: str):
    return " ".join((identifier or "").strip().split()).lower()


async def _find_active_user(identifier: str):
    normalized = _normalize_identifier(identifier)
    username = normalize_username(normalized)
    user = await users_collection.find_one({
        "$or": [
            {"username": username},
            {"email": normalized},
        ],
        "active": True,
        "role": {"$in": [UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.USER]},
    })
    return user


async def _latest_pending_otp(user_id: str):
    cursor = password_otps_collection.find({
        "user_id": user_id,
        "purpose": OTP_PURPOSE_PASSWORD_RESET,
        "status": OTP_STATUS_PENDING,
    }).sort("created_at", -1).limit(1)

    docs = await cursor.to_list(length=1)
    return docs[0] if docs else None


async def _expire_pending_otps(user_id: str):
    await password_otps_collection.update_many(
        {
            "user_id": user_id,
            "purpose": OTP_PURPOSE_PASSWORD_RESET,
            "status": OTP_STATUS_PENDING,
        },
        {
            "$set": {
                "status": OTP_STATUS_EXPIRED,
                "updated_at": _now(),
            }
        },
    )


def _public_response():
    return {"sent": True}


async def request_password_reset_otp(identifier: str, request_ip: str = None, user_agent: str = None):
    user = await _find_active_user(identifier)
    if not user:
        return _public_response()

    now = _now()
    user_id = str(user.get("_id"))
    pending = await _latest_pending_otp(user_id)
    if pending and pending.get("last_sent_at"):
        elapsed = (now - _utc_naive(pending.get("last_sent_at"))).total_seconds()
        if elapsed < Settings.PASSWORD_RESET_RESEND_COOLDOWN_SECONDS:
            bad_request(Messages.OTP_RESEND_TOO_SOON)

    await _expire_pending_otps(user_id)

    otp = f"{secrets.randbelow(1_000_000):06d}"
    expires_at = now + timedelta(minutes=Settings.PASSWORD_RESET_OTP_EXPIRE_MINUTES)

    await password_otps_collection.insert_one({
        "user_id": user_id,
        "username": user.get("username"),
        "email": user.get("email"),
        "purpose": OTP_PURPOSE_PASSWORD_RESET,
        "otp_hash": _secret_hash(otp),
        "status": OTP_STATUS_PENDING,
        "expires_at": expires_at,
        "used_at": None,
        "verified_at": None,
        "attempts": 0,
        "max_attempts": Settings.PASSWORD_RESET_MAX_ATTEMPTS,
        "resend_count": int((pending or {}).get("resend_count", 0)) + 1 if pending else 0,
        "last_sent_at": now,
        "reset_token_hash": None,
        "reset_token_expires_at": None,
        "request_ip": request_ip,
        "user_agent": user_agent,
        "created_at": now,
        "updated_at": now,
    })

    await send_password_reset_otp(user.get("email"), otp)
    return _public_response()


async def verify_password_reset_otp(identifier: str, otp: str):
    user = await _find_active_user(identifier)
    if not user:
        bad_request(Messages.INVALID_OTP)

    now = _now()
    user_id = str(user.get("_id"))
    record = await _latest_pending_otp(user_id)
    if not record:
        bad_request(Messages.INVALID_OTP)

    if _utc_naive(record.get("expires_at")) <= now:
        await password_otps_collection.update_one(
            {"_id": record.get("_id")},
            {"$set": {"status": OTP_STATUS_EXPIRED, "updated_at": now}},
        )
        bad_request(Messages.INVALID_OTP)

    if int(record.get("attempts", 0)) >= int(record.get("max_attempts", Settings.PASSWORD_RESET_MAX_ATTEMPTS)):
        await password_otps_collection.update_one(
            {"_id": record.get("_id")},
            {"$set": {"status": OTP_STATUS_BLOCKED, "updated_at": now}},
        )
        await users_collection.update_one(
            {"_id": user.get("_id")},
            {"$set": {"active": False, "updated_at": now}},
        )
        bad_request(Messages.OTP_ATTEMPTS_EXCEEDED)

    if not hmac.compare_digest(record.get("otp_hash", ""), _secret_hash((otp or "").strip())):
        attempts = int(record.get("attempts", 0)) + 1
        max_attempts = int(record.get("max_attempts", Settings.PASSWORD_RESET_MAX_ATTEMPTS))
        is_blocked = attempts >= max_attempts
        status = OTP_STATUS_BLOCKED if is_blocked else OTP_STATUS_PENDING
        await password_otps_collection.update_one(
            {"_id": record.get("_id")},
            {"$set": {"attempts": attempts, "status": status, "updated_at": now}},
        )
        if is_blocked:
            await users_collection.update_one(
                {"_id": user.get("_id")},
                {"$set": {"active": False, "updated_at": now}},
            )
            bad_request(Messages.OTP_ATTEMPTS_EXCEEDED)
        remaining = max(max_attempts - attempts, 0)
        bad_request(Messages.OTP_INVALID_WITH_ATTEMPTS.format(remaining=remaining))

    reset_token = secrets.token_urlsafe(32)
    await password_otps_collection.update_one(
        {"_id": record.get("_id")},
        {
            "$set": {
                "verified_at": now,
                "reset_token_hash": _secret_hash(reset_token),
                "reset_token_expires_at": now + timedelta(minutes=Settings.PASSWORD_RESET_TOKEN_EXPIRE_MINUTES),
                "updated_at": now,
            }
        },
    )

    return {
        "reset_token": reset_token,
        "expires_in_minutes": Settings.PASSWORD_RESET_TOKEN_EXPIRE_MINUTES,
    }


async def confirm_password_reset(reset_token: str, new_password: str):
    now = _now()
    token_hash = _secret_hash(reset_token)
    record = await password_otps_collection.find_one({
        "purpose": OTP_PURPOSE_PASSWORD_RESET,
        "status": OTP_STATUS_PENDING,
        "reset_token_hash": token_hash,
        "reset_token_expires_at": {"$gt": now},
    })

    if not record:
        bad_request(Messages.INVALID_RESET_TOKEN)

    user = await users_collection.find_one({
        "username": record.get("username"),
        "active": True,
    })
    if not user:
        bad_request(Messages.INVALID_RESET_TOKEN)

    await users_collection.update_one(
        {"_id": user.get("_id")},
        {
            "$set": {
                "password": hash_password(new_password),
                "updated_at": now,
            }
        },
    )
    await password_otps_collection.update_one(
        {"_id": record.get("_id")},
        {
            "$set": {
                "status": OTP_STATUS_USED,
                "used_at": now,
                "updated_at": now,
            }
        },
    )
    await _expire_pending_otps(str(user.get("_id")))

    return {"updated": True}
