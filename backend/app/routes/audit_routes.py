from typing import Annotated, Optional

from fastapi import APIRouter, Depends

from app.services.audit_service import (
    get_audit_logs
)
from app.services.auth_service import get_current_user

from app.utils.response import (
    success_response
)

from app.utils.messages import Messages

router = APIRouter(
    prefix="/audits",
    tags=["Audits"]
)

user_dependency = Annotated[dict, Depends(get_current_user)]


@router.get("/")
async def get_audits_api(
    auth_user: user_dependency,
    module_name: Optional[str] = None,
    event_type: Optional[str] = None,
    reference_id: Optional[str] = None,
    sku: Optional[str] = None,
    search: Optional[str] = None,
    sort_by: str = "created_at",
    order: str = "desc",
    page: int = 1,
    limit: int = 10,
):

    result = await get_audit_logs(
        auth_user=auth_user,
        module_name=module_name,
        event_type=event_type,
        reference_id=reference_id,
        sku=sku,
        search=search,
        sort_by=sort_by,
        order=order,
        page=page,
        limit=limit,
    )

    return success_response(
        message=Messages.AUDIT_LOGS_FETCHED,
        count=result["pagination"]["total"],
        data=result["items"],
        pagination=result["pagination"],
    )
