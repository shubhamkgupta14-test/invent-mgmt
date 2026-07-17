import secrets
import hmac
import jwt
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
    revoke_session,
)
from app.utils.settings import Settings
from app.utils.rate_limiter import client_ip, rate_limiter
from app.core.exceptions import forbidden
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
async def login_api(
    request: Request,
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
):
    await rate_limiter.check(
        f"login:{client_ip(request)}:{form_data.username.strip().lower()}",
        Settings.AUTH_RATE_LIMIT_ATTEMPTS,
        Settings.AUTH_RATE_LIMIT_WINDOW_SECONDS,
    )
    auth_data = await get_token_service(form_data.username, form_data.password)
    csrf_token = secrets.token_urlsafe(32)
    max_age = Settings.SESSION_ABSOLUTE_TIMEOUT_HOURS * 60 * 60
    response = success_response(
        message=Messages.LOGIN_SUCCESS,
        data={
            "authenticated": True,
            "csrf_token": csrf_token,
            "idle_timeout_seconds": Settings.SESSION_IDLE_TIMEOUT_MINUTES * 60,
            "absolute_timeout_seconds": Settings.SESSION_ABSOLUTE_TIMEOUT_HOURS * 60 * 60,
        },
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
async def logout(request: Request):
    csrf_cookie = request.cookies.get(Settings.CSRF_COOKIE_NAME, "")
    csrf_header = request.headers.get("X-CSRF-Token", "")
    if not csrf_cookie or not csrf_header or not hmac.compare_digest(csrf_cookie, csrf_header):
        forbidden(Messages.ACCESS_DENIED)
    token = request.cookies.get(Settings.AUTH_COOKIE_NAME)
    if token:
        try:
            payload = jwt.decode(
                token,
                Settings.SECRET_KEY,
                algorithms=[Settings.ALGORITHM],
                options={"verify_exp": False},
            )
            await revoke_session(payload.get("sid"))
        except jwt.InvalidTokenError:
            pass
    response = success_response(
        message=Messages.LOGOUT_SUCCESS
    )
    response.delete_cookie(Settings.AUTH_COOKIE_NAME, path="/")
    response.delete_cookie(Settings.CSRF_COOKIE_NAME, path="/")
    return response


@router.post("/session/keep-alive")
async def keep_session_alive(
    _: Annotated[dict, Depends(get_current_user)],
):
    return success_response(
        message="Session extended",
        data={"idle_timeout_seconds": Settings.SESSION_IDLE_TIMEOUT_MINUTES * 60},
    )


@router.post("/password-reset/request")
async def request_password_reset_api(
    payload: PasswordResetRequest,
    request: Request,
):
    await rate_limiter.check(
        f"password-reset-request:{client_ip(request)}:{payload.identifier.strip().lower()}",
        Settings.OTP_RATE_LIMIT_ATTEMPTS,
        Settings.OTP_RATE_LIMIT_WINDOW_SECONDS,
    )
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
async def verify_password_reset_otp_api(
    payload: PasswordResetVerifyOtpRequest,
    request: Request,
):
    await rate_limiter.check(
        f"password-reset-verify:{client_ip(request)}:{payload.identifier.strip().lower()}",
        Settings.OTP_RATE_LIMIT_ATTEMPTS,
        Settings.OTP_RATE_LIMIT_WINDOW_SECONDS,
    )
    result = await verify_password_reset_otp(
        identifier=payload.identifier,
        otp=payload.otp,
    )

    return success_response(
        message=Messages.PASSWORD_RESET_OTP_VERIFIED,
        data=result,
    )


@router.post("/password-reset/confirm")
async def confirm_password_reset_api(
    payload: PasswordResetConfirmRequest,
    request: Request,
):
    await rate_limiter.check(
        f"password-reset-confirm:{client_ip(request)}",
        Settings.OTP_RATE_LIMIT_ATTEMPTS,
        Settings.OTP_RATE_LIMIT_WINDOW_SECONDS,
    )
    result = await confirm_password_reset(
        reset_token=payload.reset_token,
        new_password=payload.new_password,
    )

    return success_response(
        message=Messages.PASSWORD_RESET_SUCCESS,
        data=result,
    )
