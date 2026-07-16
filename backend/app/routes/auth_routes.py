import secrets
from fastapi import APIRouter, Depends, Request, status
from typing import Annotated
from fastapi.security import OAuth2PasswordRequestForm
from app.models.auth import (
    PasswordResetConfirmRequest,
    PasswordResetRequest,
    PasswordResetVerifyOtpRequest,
)

from app.services.auth_service import (
    get_current_user,
    get_token_service,
)
from app.utils.settings import Settings
from app.services.password_reset_service import (
    confirm_password_reset,
    request_password_reset_otp,
    verify_password_reset_otp,
)

from app.utils.messages import Messages

from app.utils.response import success_response


router = APIRouter(
    prefix="/auth",
    tags=["Auth"]
)


@router.post("/login", status_code=status.HTTP_200_OK)
async def login_api(form_data: Annotated[OAuth2PasswordRequestForm, Depends()]):
    auth_data = await get_token_service(form_data.username, form_data.password)
    csrf_token = secrets.token_urlsafe(32)
    max_age = Settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    response = success_response(
        message=Messages.LOGIN_SUCCESS,
        data={"authenticated": True, "csrf_token": csrf_token},
    )
    response.set_cookie(
        key=Settings.AUTH_COOKIE_NAME,
        value=auth_data["access_token"],
        max_age=max_age,
        httponly=True,
        secure=Settings.COOKIE_SECURE,
        samesite=Settings.COOKIE_SAMESITE,
        path="/",
    )
    response.set_cookie(
        key=Settings.CSRF_COOKIE_NAME,
        value=csrf_token,
        max_age=max_age,
        httponly=True,
        secure=Settings.COOKIE_SECURE,
        samesite=Settings.COOKIE_SAMESITE,
        path="/",
    )
    return response


@router.get("/csrf")
async def csrf_token_api(
    request: Request,
    _: Annotated[dict, Depends(get_current_user)],
):
    csrf_token = request.cookies.get(Settings.CSRF_COOKIE_NAME)
    return success_response(
        message=Messages.SUCCESS,
        data={"csrf_token": csrf_token},
    )


@router.post("/logout")
async def logout(_: Annotated[dict, Depends(get_current_user)]):
    response = success_response(
        message=Messages.LOGOUT_SUCCESS
    )
    response.delete_cookie(Settings.AUTH_COOKIE_NAME, path="/")
    response.delete_cookie(Settings.CSRF_COOKIE_NAME, path="/")
    return response


@router.post("/password-reset/request")
async def request_password_reset_api(
    payload: PasswordResetRequest,
    request: Request,
):
    result = await request_password_reset_otp(
        identifier=payload.identifier,
        request_ip=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )

    return success_response(
        message=Messages.PASSWORD_RESET_OTP_SENT,
        data=result,
    )


@router.post("/password-reset/verify-otp")
async def verify_password_reset_otp_api(payload: PasswordResetVerifyOtpRequest):
    result = await verify_password_reset_otp(
        identifier=payload.identifier,
        otp=payload.otp,
    )

    return success_response(
        message=Messages.PASSWORD_RESET_OTP_VERIFIED,
        data=result,
    )


@router.post("/password-reset/confirm")
async def confirm_password_reset_api(payload: PasswordResetConfirmRequest):
    result = await confirm_password_reset(
        reset_token=payload.reset_token,
        new_password=payload.new_password,
    )

    return success_response(
        message=Messages.PASSWORD_RESET_SUCCESS,
        data=result,
    )
