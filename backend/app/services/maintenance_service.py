from datetime import UTC, datetime
from time import monotonic

from app.core.exceptions import bad_request, forbidden
from app.database.mongodb import db
from app.models.auth import UserRole
from app.utils.helpers import format_datetime_iso

maintenance_collection = db.app_config
MAINTENANCE_CONFIG_KEY = "maintenance_mode"
DEFAULT_MESSAGE = "We are performing scheduled maintenance. Please try again shortly."
CACHE_SECONDS = 10

_cached_config = None
_cache_loaded_at = 0.0


def _utc(value):
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value.astimezone(UTC)


def _public_config(config):
    now = datetime.now(UTC)
    starts_at = _utc(config.get("starts_at"))
    ends_at = _utc(config.get("ends_at"))
    enabled = bool(config.get("enabled", False))
    active = enabled and (not starts_at or starts_at <= now) and (not ends_at or now < ends_at)
    return {
        "enabled": enabled,
        "active": active,
        "message": config.get("message") or DEFAULT_MESSAGE,
        "starts_at": format_datetime_iso(starts_at) if starts_at else None,
        "ends_at": format_datetime_iso(ends_at) if ends_at else None,
        "updated_at": format_datetime_iso(config.get("updated_at")) if config.get("updated_at") else None,
    }


async def get_maintenance_config(use_cache=True):
    global _cached_config, _cache_loaded_at
    if use_cache and _cached_config is not None and monotonic() - _cache_loaded_at < CACHE_SECONDS:
        return _cached_config

    stored = await maintenance_collection.find_one({"config_key": MAINTENANCE_CONFIG_KEY})
    _cached_config = _public_config(stored or {})
    _cache_loaded_at = monotonic()
    return _cached_config


async def get_admin_maintenance_config(auth_user):
    if auth_user.get("role") != UserRole.SUPERADMIN:
        forbidden()
    return await get_maintenance_config(use_cache=False)


async def set_maintenance_config(auth_user, payload):
    if auth_user.get("role") != UserRole.SUPERADMIN:
        forbidden()

    starts_at = _utc(payload.starts_at)
    ends_at = _utc(payload.ends_at)
    if starts_at and ends_at and ends_at <= starts_at:
        bad_request("Maintenance end time must be later than the start time")

    now = datetime.now(UTC)
    await maintenance_collection.update_one(
        {"config_key": MAINTENANCE_CONFIG_KEY},
        {
            "$set": {
                "config_key": MAINTENANCE_CONFIG_KEY,
                "enabled": payload.enabled,
                "message": payload.message.strip(),
                "starts_at": starts_at,
                "ends_at": ends_at,
                "updated_at": now,
                "updated_by": auth_user.get("username"),
            },
            "$setOnInsert": {"created_at": now},
        },
        upsert=True,
    )

    global _cached_config, _cache_loaded_at
    _cached_config = None
    _cache_loaded_at = 0.0
    return await get_maintenance_config(use_cache=False)
