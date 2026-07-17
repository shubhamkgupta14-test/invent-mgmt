import jwt
from jwt import InvalidTokenError
from starlette.middleware.base import BaseHTTPMiddleware

from app.services.maintenance_service import get_maintenance_config
from app.utils.response import failure_response
from app.utils.settings import Settings


class MaintenanceModeMiddleware(BaseHTTPMiddleware):
    PUBLIC_PATHS = {
        "/",
        "/health",
        "/maintenance/status",
        "/auth/login",
        "/auth/logout",
        "/auth/csrf",
    }
    SUPERADMIN_PATHS = (
        "/admin-access",
        "/users",
        "/notifications",
        "/audits",
        "/api-logs",
        "/maintenance",
        "/company/settings",
        "/mailer",
    )

    @staticmethod
    def _is_superadmin(request):
        token = request.cookies.get(Settings.AUTH_COOKIE_NAME)
        if not token:
            return False
        try:
            payload = jwt.decode(token, Settings.SECRET_KEY, algorithms=[Settings.ALGORITHM])
            return payload.get("role") == "superadmin"
        except InvalidTokenError:
            return False

    async def dispatch(self, request, call_next):
        path = request.url.path.rstrip("/") or "/"
        if (
            request.method == "OPTIONS"
            or path in self.PUBLIC_PATHS
            or path.startswith("/auth/password-reset/")
            or path.startswith("/uploads/")
        ):
            return await call_next(request)

        config = await get_maintenance_config()
        if not config["active"]:
            return await call_next(request)
        if self._is_superadmin(request) and path.startswith(self.SUPERADMIN_PATHS):
            return await call_next(request)

        response = failure_response(
            message=config["message"],
            status_code=503,
            data={
                "code": "MAINTENANCE_MODE",
                "maintenance": config,
            },
        )
        if config.get("ends_at"):
            response.headers["Retry-After"] = config["ends_at"]
        return response
