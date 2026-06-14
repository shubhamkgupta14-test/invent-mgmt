from typing import Optional

from fastapi import APIRouter

from app.services.audit_service import (
    get_audit_logs
)

from app.utils.response import (
    success_response
)

from app.utils.messages import Messages

router = APIRouter(
    prefix="/audits",
    tags=["Audits"]
)


@router.get("/")
async def get_audits_api(
    module_name: Optional[str] = None,
    event_type: Optional[str] = None,
    reference_id: Optional[str] = None,
    sku: Optional[str] = None
):

    result = await get_audit_logs(
        module_name=module_name,
        event_type=event_type,
        reference_id=reference_id,
        sku=sku
    )

    return success_response(
        message=Messages.AUDIT_LOGS_FETCHED,
        count=len(result),
        data=result
    )
