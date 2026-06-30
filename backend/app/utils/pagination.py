import re

from app.core.exceptions import bad_request
from app.utils.messages import Messages

DEFAULT_PAGE = 1
DEFAULT_LIMIT = 10
MAX_LIMIT = 100


def clean_search(value: str | None):
    value = (value or "").strip()
    return value or None


def page_bounds(page: int = DEFAULT_PAGE, limit: int = DEFAULT_LIMIT):
    try:
        page = int(page)
        limit = int(limit)
    except (TypeError, ValueError):
        bad_request("Invalid pagination parameters")

    page = max(page, 1)
    limit = min(max(limit, 1), MAX_LIMIT)
    return page, limit, (page - 1) * limit


def sort_direction(order: str = "desc"):
    order = (order or "desc").lower()
    if order not in ["asc", "desc"]:
        bad_request(Messages.INVALID_SORT_FIELD)
    return -1 if order == "desc" else 1


def validate_sort_field(sort_by: str, allowed_fields: list[str]):
    if sort_by not in allowed_fields:
        bad_request(Messages.INVALID_SORT_FIELD)
    return sort_by


def regex_filter(search: str | None, fields: list[str]):
    search = clean_search(search)
    if not search:
        return {}

    pattern = re.escape(search)
    return {
        "$or": [
            {field: {"$regex": pattern, "$options": "i"}}
            for field in fields
        ]
    }


async def paginate_collection(
    collection,
    query: dict,
    sort_by: str,
    order: str,
    page: int,
    limit: int,
    builder,
):
    page, limit, skip = page_bounds(page, limit)
    sort_order = sort_direction(order)
    total = await collection.count_documents(query)
    items = []

    cursor = collection.find(query).sort(sort_by, sort_order).skip(skip).limit(limit)
    async for item in cursor:
        items.append(builder(item))

    return {
        "items": items,
        "pagination": {
            "page": page,
            "limit": limit,
            "total": total,
            "pages": max((total + limit - 1) // limit, 1),
            "has_prev": page > 1,
            "has_next": page * limit < total,
        },
    }
