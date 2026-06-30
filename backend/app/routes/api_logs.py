from typing import Annotated, Optional

from fastapi import APIRouter, Depends

from app.services.api_log_service import (
    get_api_log_by_trace_id,
    get_api_logs,
)
from app.services.auth_service import get_current_user
from app.utils.messages import Messages
from app.utils.response import success_response

router = APIRouter(
    prefix="/api-logs",
    tags=["API Logs"]
)

user_dependency = Annotated[dict, Depends(get_current_user)]


@router.get("/")
async def get_api_logs_api(
    auth_user: user_dependency,
    method: Optional[str] = None,
    path: Optional[str] = None,
    status_code: Optional[int] = None,
    user: Optional[str] = None,
    role: Optional[str] = None,
    trace_id: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    min_duration_ms: Optional[float] = None,
    success: Optional[bool] = None,
    page: int = 1,
    limit: int = 10,
):
    result = await get_api_logs(
        auth_user=auth_user,
        filters={
            "method": method,
            "path": path,
            "status_code": status_code,
            "user": user,
            "role": role,
            "trace_id": trace_id,
            "start_date": start_date,
            "end_date": end_date,
            "min_duration_ms": min_duration_ms,
            "success": success,
        },
        pagination={
            "page": page,
            "limit": limit,
        }
    )

    return success_response(
        message=Messages.API_LOGS_FETCHED,
        data=result,
        count=result.get("pagination", {}).get("total", 0),
    )


@router.get("/{trace_id}")
async def get_api_log_by_trace_id_api(
    auth_user: user_dependency,
    trace_id: str
):
    result = await get_api_log_by_trace_id(
        auth_user=auth_user,
        trace_id=trace_id
    )

    return success_response(
        message=Messages.API_LOG_FETCHED,
        data=result,
    )
