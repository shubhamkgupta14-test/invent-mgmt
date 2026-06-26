from app.utils.responseBuilder import build_audit_response
from datetime import datetime, UTC

from app.database.mongodb import db
from app.core.exceptions import forbidden
from app.models.auth import UserRole

audit_collection = db.audits


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
    sku: str = None
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

    audits = []

    async for audit in audit_collection.find(
        filters
    ).sort("created_at", -1):

        audits.append(
            build_audit_response(audit)
        )

    return audits
