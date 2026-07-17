from typing import Annotated

from fastapi import APIRouter, Depends, Request

from app.models.auth import AdminOtpVerifyRequest
from app.services.admin_access_service import (
    begin_admin_access,
    get_admin_access_status,
    request_admin_otp,
    verify_admin_otp,
)
from app.services.auth_service import get_current_user
from app.utils.response import success_response

router = APIRouter(prefix="/admin-access", tags=["Admin Access"])
user_dependency = Annotated[dict, Depends(get_current_user)]


@router.get("/status")
async def status(auth_user: user_dependency):
    return success_response("Administration access status fetched", await get_admin_access_status(auth_user))


@router.post("/begin")
async def begin(auth_user: user_dependency):
    return success_response(
        "Administration verification required",
        await begin_admin_access(auth_user),
    )


@router.post("/request-otp")
async def request_otp(request: Request, auth_user: user_dependency):
    data = await request_admin_otp(
        auth_user,
        request.client.host if request.client else None,
        request.headers.get("user-agent"),
    )
    return success_response("Administration OTP sent", data)


@router.post("/verify-otp")
async def verify_otp(payload: AdminOtpVerifyRequest, auth_user: user_dependency):
    return success_response("Administration access verified", await verify_admin_otp(auth_user, payload.otp))
