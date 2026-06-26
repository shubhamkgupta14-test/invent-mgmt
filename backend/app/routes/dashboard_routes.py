from fastapi import APIRouter, Depends

from typing import Annotated

from app.services.dashboard_service import (
    get_dashboard_summary
)

from app.utils.response import (
    success_response
)

from app.services.auth_service import get_current_user
from app.utils.messages import Messages

router = APIRouter(
    prefix="/dashboard",
    tags=["Dashboard"]
)

user_dependency = Annotated[dict, Depends(get_current_user)]


@router.get("/summary")
async def dashboard_summary(auth_user: user_dependency):

    result = await get_dashboard_summary(auth_user)

    return success_response(
        message=Messages.DASHBOARD_SUMMARY_FETCHED,
        data=result
    )

