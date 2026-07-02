from datetime import datetime, UTC

from app.core.exceptions import forbidden, not_found
from app.database.mongodb import db
from app.models.auth import UserRole
from app.utils.helpers import format_datetime_iso

api_logs_collection = db.api_logs
app_config_collection = db.app_config
API_TRACING_CONFIG_KEY = "api_tracing"
API_TRACING_ENABLED = None


async def is_api_tracing_enabled():
    global API_TRACING_ENABLED
    if API_TRACING_ENABLED is not None:
        return API_TRACING_ENABLED

    config = await app_config_collection.find_one({"config_key": API_TRACING_CONFIG_KEY})
    API_TRACING_ENABLED = bool(config.get("enabled", True)) if config else True
    return API_TRACING_ENABLED


async def get_api_tracing_status(auth_user: dict):
    if auth_user.get("role") != UserRole.SUPERADMIN:
        forbidden()
    return {"enabled": await is_api_tracing_enabled()}


async def set_api_tracing_status(auth_user: dict, enabled: bool):
    if auth_user.get("role") != UserRole.SUPERADMIN:
        forbidden()
    global API_TRACING_ENABLED
    API_TRACING_ENABLED = bool(enabled)
    await app_config_collection.update_one(
        {"config_key": API_TRACING_CONFIG_KEY},
        {
            "$set": {
                "config_key": API_TRACING_CONFIG_KEY,
                "enabled": API_TRACING_ENABLED,
                "updated_at": datetime.now(UTC),
                "updated_by": auth_user.get("username"),
            },
            "$setOnInsert": {"created_at": datetime.now(UTC)},
        },
        upsert=True,
    )
    return {"enabled": API_TRACING_ENABLED}


def _parse_datetime(value):
    if not value:
        return None

    try:
        normalized = value.replace("Z", "+00:00")
        parsed = datetime.fromisoformat(normalized)
        if parsed.tzinfo:
            return parsed.astimezone(UTC).replace(tzinfo=None)
        return parsed
    except ValueError:
        return None


def _serialize_api_log(log: dict, include_bodies: bool = False):
    data = {
        "id": str(log.get("_id")),
        "trace_id": log.get("trace_id"),
        "method": log.get("method"),
        "path": log.get("path"),
        "query_params": log.get("query_params", {}),
        "status_code": log.get("status_code"),
        "duration_ms": log.get("duration_ms"),
        "ip_address": log.get("ip_address"),
        "user_agent": log.get("user_agent"),
        "user": log.get("user"),
        "role": log.get("role"),
        "error_message": log.get("error_message"),
        "created_at": format_datetime_iso(log.get("created_at")),
    }

    if include_bodies:
        data.update({
            "request_headers": log.get("request_headers", {}),
            "request_body": log.get("request_body"),
            "response_body": log.get("response_body"),
        })

    return data


async def create_api_log(log_data: dict):
    return await api_logs_collection.insert_one(log_data)


async def get_api_logs(auth_user: dict, filters: dict, pagination: dict):
    if auth_user.get("role") != UserRole.SUPERADMIN:
        forbidden()

    query = {}

    if filters.get("method"):
        query["method"] = filters.get("method").upper()

    if filters.get("path"):
        query["path"] = {"$regex": filters.get("path"), "$options": "i"}

    if filters.get("status_code") is not None:
        query["status_code"] = filters.get("status_code")

    if filters.get("user"):
        query["user"] = {"$regex": filters.get("user"), "$options": "i"}

    if filters.get("role"):
        query["role"] = filters.get("role")

    if filters.get("trace_id"):
        query["trace_id"] = filters.get("trace_id")

    created_at = {}
    start_date = _parse_datetime(filters.get("start_date"))
    end_date = _parse_datetime(filters.get("end_date"))
    if start_date:
        created_at["$gte"] = start_date
    if end_date:
        created_at["$lte"] = end_date
    if created_at:
        query["created_at"] = created_at

    if filters.get("min_duration_ms") is not None:
        query["duration_ms"] = {"$gte": filters.get("min_duration_ms")}

    if filters.get("success") is True:
        query["status_code"] = {"$lt": 400}
    elif filters.get("success") is False:
        query["status_code"] = {"$gte": 400}

    page = max(pagination.get("page", 1), 1)
    limit = min(max(pagination.get("limit", 10), 1), 100)
    skip = (page - 1) * limit

    total = await api_logs_collection.count_documents(query)

    logs = []
    async for log in api_logs_collection.find(query).sort("created_at", -1).skip(skip).limit(limit):
        logs.append(_serialize_api_log(log))

    return {
        "items": logs,
        "pagination": {
            "page": page,
            "limit": limit,
            "total": total,
            "pages": max((total + limit - 1) // limit, 1),
            "has_prev": page > 1,
            "has_next": page * limit < total,
        }
    }


async def get_api_log_by_trace_id(auth_user: dict, trace_id: str):
    if auth_user.get("role") != UserRole.SUPERADMIN:
        forbidden()

    log = await api_logs_collection.find_one({"trace_id": trace_id})
    if not log:
        not_found("API log not found")

    return _serialize_api_log(log, include_bodies=True)
