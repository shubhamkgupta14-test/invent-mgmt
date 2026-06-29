import json
import time
from datetime import datetime, UTC
from urllib.parse import parse_qs
from uuid import uuid4

from jose import JWTError, jwt
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from app.services.api_log_service import create_api_log
from app.utils.settings import Settings

SENSITIVE_KEYS = {
    "authorization",
    "password",
    "token",
    "access_token",
    "refresh_token",
    "otp",
}
REQUEST_BODY_LIMIT = 10 * 1024
RESPONSE_BODY_LIMIT = 20 * 1024
EXCLUDED_PREFIXES = (
    "/docs",
    "/redoc",
    "/api-logs",
)
EXCLUDED_PATHS = (
    "/openapi.json",
    "/health",
)


def _is_sensitive_key(key):
    normalized = str(key or "").lower()
    return any(sensitive in normalized for sensitive in SENSITIVE_KEYS)


def _mask_value(value):
    if isinstance(value, dict):
        return {
            key: "[MASKED]" if _is_sensitive_key(key) else _mask_value(item)
            for key, item in value.items()
        }

    if isinstance(value, list):
        return [_mask_value(item) for item in value]

    return value


def _mask_headers(headers):
    return {
        key: "[MASKED]" if _is_sensitive_key(key) else value
        for key, value in headers.items()
    }


def _body_to_log_value(body: bytes, limit: int, content_type: str = ""):
    if not body:
        return None

    if len(body) > limit:
        return {
            "truncated": True,
            "message": f"Body exceeded {limit} bytes and was not stored.",
            "size_bytes": len(body),
        }

    try:
        text = body.decode("utf-8")
    except UnicodeDecodeError:
        return {
            "truncated": False,
            "message": "Binary body omitted.",
            "size_bytes": len(body),
        }

    if "application/x-www-form-urlencoded" in content_type:
        parsed_form = {
            key: values[0] if len(values) == 1 else values
            for key, values in parse_qs(text, keep_blank_values=True).items()
        }
        return _mask_value(parsed_form)

    try:
        parsed = json.loads(text)
        return _mask_value(parsed)
    except json.JSONDecodeError:
        return text


def _extract_user_context(request: Request):
    auth_header = request.headers.get("authorization", "")
    if not auth_header.lower().startswith("bearer "):
        return None, None

    token = auth_header.split(" ", 1)[1]
    try:
        payload = jwt.decode(
            token,
            Settings.SECRET_KEY,
            algorithms=[Settings.ALGORITHM],
            options={"verify_exp": False},
        )
        return payload.get("username"), payload.get("role")
    except JWTError:
        return None, None


class ApiLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        path = request.url.path.rstrip("/") or "/"
        if (
            path in EXCLUDED_PATHS
            or any(path == prefix or path.startswith(f"{prefix}/") for prefix in EXCLUDED_PREFIXES)
        ):
            return await call_next(request)

        trace_id = str(uuid4())
        start_time = time.perf_counter()
        request_body = b""
        response_body = b""
        status_code = None
        error_message = None
        response = None

        try:
            request_body = await request.body()

            async def receive():
                return {
                    "type": "http.request",
                    "body": request_body,
                    "more_body": False,
                }

            request._receive = receive
            response = await call_next(request)
            status_code = response.status_code

            chunks = []
            async for chunk in response.body_iterator:
                chunks.append(chunk)
            response_body = b"".join(chunks)

            return Response(
                content=response_body,
                status_code=response.status_code,
                headers=dict(response.headers),
                media_type=response.media_type,
                background=response.background,
            )
        except Exception as exc:
            error_message = str(exc)
            status_code = 500
            raise
        finally:
            try:
                duration_ms = round((time.perf_counter() - start_time) * 1000, 2)
                username, role = _extract_user_context(request)
                forwarded_for = request.headers.get("x-forwarded-for")
                ip_address = (
                    forwarded_for.split(",")[0].strip()
                    if forwarded_for
                    else request.client.host if request.client else None
                )

                await create_api_log({
                    "trace_id": trace_id,
                    "method": request.method,
                    "path": request.url.path,
                    "query_params": _mask_value(dict(request.query_params)),
                    "status_code": status_code,
                    "duration_ms": duration_ms,
                    "ip_address": ip_address,
                    "user_agent": request.headers.get("user-agent"),
                    "request_headers": _mask_headers(dict(request.headers)),
                    "request_body": _body_to_log_value(
                        request_body,
                        REQUEST_BODY_LIMIT,
                        request.headers.get("content-type", ""),
                    ),
                    "response_body": _body_to_log_value(
                        response_body,
                        RESPONSE_BODY_LIMIT,
                        response.headers.get("content-type", "") if response else "",
                    ),
                    "error_message": error_message,
                    "user": username,
                    "role": role,
                    "created_at": datetime.now(UTC),
                })
            except Exception:
                pass
