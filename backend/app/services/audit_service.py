from app.utils.responseBuilder import build_audit_response
from datetime import datetime, UTC

from app.database.mongodb import db
from app.core.exceptions import forbidden
from app.models.auth import UserRole
from app.utils.pagination import paginate_collection, regex_filter, validate_sort_field

audit_collection = db.audits
users_collection = db.users


# CREATE AUDITS


async def create_audit_log(
    module_name: str,
    event_type: str,
    performed_by: str,
    reference_id: str = None,
    sku: str = None,
    old_data: dict = None,
    new_data: dict = None
):
    audit_document = {
        "module_name": module_name,
        "event_type": event_type,
        "reference_id": reference_id or "NA",
        "sku": sku or "NA",
        "old_data": old_data or "NA",
        "new_data": new_data,
        "performed_by": performed_by,
        "created_at": datetime.now(UTC)
    }

    await audit_collection.insert_one(
        audit_document
    )


async def get_audit_logs(
    auth_user: dict,
    module_name: str = None,
    event_type: str = None,
    reference_id: str = None,
    sku: str = None,
    search: str = None,
    sort_by: str = "created_at",
    order: str = "desc",
    page: int = 1,
    limit: int = 10,
):
    if auth_user.get("role") != UserRole.SUPERADMIN:
        forbidden()

    filters = {}

    if module_name:
        filters["module_name"] = module_name

    if event_type:
        filters["event_type"] = event_type

    if reference_id:
        filters["reference_id"] = reference_id

    if sku:
        filters["sku"] = sku

    validate_sort_field(sort_by, [
        "created_at",
        "module_name",
        "event_type",
        "reference_id",
        "sku",
        "performed_by",
    ])

    search_filter = regex_filter(search, [
        "module_name",
        "event_type",
        "reference_id",
        "sku",
        "performed_by",
    ])
    if search_filter:
        filters = {"$and": [filters, search_filter]} if filters else search_filter

    result = await paginate_collection(
        audit_collection,
        filters,
        sort_by,
        order,
        page,
        limit,
        build_audit_response,
    )

    usernames = [
        item.get("performed_by")
        for item in result["items"]
        if item.get("performed_by") and not item.get("actor_role")
    ]
    if usernames:
        role_by_username = {}
        async for user in users_collection.find(
            {"username": {"$in": list(set(usernames))}},
            {"_id": 0, "username": 1, "role": 1},
        ):
            role_by_username[user.get("username")] = user.get("role")

        for item in result["items"]:
            item["actor_role"] = item.get("actor_role") or role_by_username.get(item.get("performed_by"))

    return result
