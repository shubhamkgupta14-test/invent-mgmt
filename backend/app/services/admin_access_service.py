import hashlib
import hmac
import secrets
from datetime import UTC, datetime, timedelta

from fastapi import Depends, Request

from app.core.exceptions import bad_request, forbidden
from app.database.mongodb import db
from app.models.auth import UserRole
from app.services.auth_service import get_current_user
from app.services.email_service import send_admin_portal_otp
from app.utils.settings import Settings

admin_otps_collection = db.admin_otps
sessions_collection = db.auth_sessions
users_collection = db.users


def _now():
    return datetime.now(UTC).replace(tzinfo=None)


def _hash(value):
    return hmac.new(
        Settings.SECRET_KEY.encode(),
        value.encode(),
        hashlib.sha256,
    ).hexdigest()


async def require_superadmin(auth_user):
    if auth_user.get("role") != UserRole.SUPERADMIN:
        forbidden("Super Admin access required")
    return auth_user


async def get_verified_superadmin(
    request: Request,
    auth_user: dict = Depends(get_current_user),
):
    await require_superadmin(auth_user)
    session = await sessions_collection.find_one({
        "session_id": auth_user.get("session_id"),
        "user_id": auth_user.get("user_id"),
    })
    verified_until = (session or {}).get("admin_verified_until")
    if not verified_until or verified_until <= _now():
        forbidden("Administration OTP verification required")
    return auth_user


async def get_admin_access_status(auth_user):
    await require_superadmin(auth_user)
    session = await sessions_collection.find_one({
        "session_id": auth_user.get("session_id"),
        "user_id": auth_user.get("user_id"),
    })
    verified_until = (session or {}).get("admin_verified_until")
    portal_key = (session or {}).get("admin_portal_key")
    if not portal_key:
        portal_key = secrets.token_urlsafe(7)
        await sessions_collection.update_one(
            {"session_id": auth_user.get("session_id")},
            {"$set": {"admin_portal_key": portal_key}},
        )
    return {
        "verified": bool(verified_until and verified_until > _now()),
        "verified_until": verified_until.isoformat() if verified_until else None,
        "portal_key": portal_key,
    }


async def begin_admin_access(auth_user):
    status = await get_admin_access_status(auth_user)
    await sessions_collection.update_one(
        {"session_id": auth_user.get("session_id")},
        {"$unset": {"admin_verified_until": ""}},
    )
    status["verified"] = False
    status["verified_until"] = None
    return status


async def request_admin_otp(auth_user, request_ip=None, user_agent=None):
    await require_superadmin(auth_user)
    now = _now()
    pending = await admin_otps_collection.find_one({
        "session_id": auth_user.get("session_id"),
        "status": "PENDING",
    })
    if pending and pending.get("last_sent_at"):
        elapsed = (now - pending["last_sent_at"]).total_seconds()
        if elapsed < Settings.ADMIN_OTP_RESEND_COOLDOWN_SECONDS:
            bad_request("Please wait before requesting another administration OTP")

    await admin_otps_collection.update_many(
        {"session_id": auth_user.get("session_id"), "status": "PENDING"},
        {"$set": {"status": "EXPIRED", "updated_at": now}},
    )
    user = await users_collection.find_one({"username": auth_user.get("username")})
    if not user or not user.get("email"):
        bad_request("A registered email address is required for administration access")

    otp = f"{secrets.randbelow(1_000_000):06d}"
    await admin_otps_collection.insert_one({
        "user_id": auth_user.get("user_id"),
        "username": auth_user.get("username"),
        "session_id": auth_user.get("session_id"),
        "otp_hash": _hash(otp),
        "status": "PENDING",
        "attempts": 0,
        "max_attempts": Settings.ADMIN_OTP_MAX_ATTEMPTS,
        "expires_at": now + timedelta(minutes=Settings.ADMIN_OTP_EXPIRE_MINUTES),
        "last_sent_at": now,
        "request_ip": request_ip,
        "user_agent": user_agent,
        "created_at": now,
        "updated_at": now,
    })
    await send_admin_portal_otp(user["email"], otp)
    data = {
        "sent": True,
        "masked_email": _mask_email(user["email"]),
        "resend_cooldown_seconds": Settings.ADMIN_OTP_RESEND_COOLDOWN_SECONDS,
    }
    if Settings.EXPOSE_DEV_OTP:
        data["dev_otp"] = otp
    return data


def _mask_email(email):
    local, separator, domain = email.partition("@")
    if not separator:
        return "***"
    return f"{local[:2]}***@{domain}"


async def verify_admin_otp(auth_user, otp):
    await require_superadmin(auth_user)
    now = _now()
    record = await admin_otps_collection.find_one({
        "session_id": auth_user.get("session_id"),
        "status": "PENDING",
    })
    if not record or record.get("expires_at") <= now:
        bad_request("The administration OTP is invalid or expired")

    attempts = int(record.get("attempts", 0))
    maximum = int(record.get("max_attempts", Settings.ADMIN_OTP_MAX_ATTEMPTS))
    if attempts >= maximum:
        bad_request("Maximum OTP attempts exceeded")
    if not hmac.compare_digest(record.get("otp_hash", ""), _hash(otp.strip())):
        attempts += 1
        blocked = attempts >= maximum
        await admin_otps_collection.update_one(
            {"_id": record["_id"]},
            {"$set": {
                "attempts": attempts,
                "status": "BLOCKED" if blocked else "PENDING",
                "updated_at": now,
            }},
        )
        if blocked:
            bad_request("Maximum OTP attempts exceeded")
        bad_request(f"Invalid OTP. {maximum - attempts} attempts remaining")

    verified_until = now + timedelta(minutes=Settings.ADMIN_VERIFICATION_MINUTES)
    await admin_otps_collection.update_one(
        {"_id": record["_id"]},
        {"$set": {"status": "USED", "verified_at": now, "updated_at": now}},
    )
    await sessions_collection.update_one(
        {"session_id": auth_user.get("session_id")},
        {"$set": {"admin_verified_until": verified_until}},
    )
    return {"verified": True, "verified_until": verified_until.isoformat()}
