import os
import re
from pathlib import Path
from urllib.parse import urlsplit
from zoneinfo import ZoneInfo

from dotenv import load_dotenv

from app.config.defaults import app_default

BACKEND_DIR = Path(__file__).resolve().parents[2]
load_dotenv(dotenv_path=BACKEND_DIR / ".env")

_requested_environment = (os.getenv("ENVIRONMENT") or "dev").strip().lower()
_environment_suffix = {
    "dev": "dev",
    "development": "dev",
    "production": "prod",
}.get(_requested_environment, _requested_environment)
_environment_file = (
    BACKEND_DIR / ".env"
    if _environment_suffix == "dev"
    else BACKEND_DIR / f".env.{_environment_suffix}"
)
if _environment_file.is_file():
    load_dotenv(dotenv_path=_environment_file, override=True)


def env_int(name: str, default: int):
    value = os.getenv(name)
    if value is None or value.strip() == "":
        return default
    return int(value)


def env_list(name: str, default: list[str] | None = None):
    value = os.getenv(name)
    if value is None or value.strip() == "":
        return default or []
    return [item.strip() for item in value.split(",") if item.strip()]


def env_bool(name: str, default: bool = False):
    value = os.getenv(name)
    if value is None or value.strip() == "":
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


class Settings:
    DEFAULT_BRAND_NAME = app_default("DEFAULT_BRAND_NAME", "E-Store")
    ENVIRONMENT = os.getenv("ENVIRONMENT") or "dev"
    IS_DEVELOPMENT = ENVIRONMENT.strip().lower() in {
        "dev", "development", "local", "test"
    }
    API_DOCS_ENABLED = env_bool("API_DOCS_ENABLED", IS_DEVELOPMENT)
    SESSION_IDLE_TIMEOUT_MINUTES = app_default("SESSION_IDLE_TIMEOUT_MINUTES", 15)
    SESSION_ABSOLUTE_TIMEOUT_HOURS = app_default("SESSION_ABSOLUTE_TIMEOUT_HOURS", 8)
    ACCESS_TOKEN_EXPIRE_MINUTES = SESSION_ABSOLUTE_TIMEOUT_HOURS * 60
    TOKEN_TYPE = app_default("TOKEN_TYPE", "bearer")
    AUTH_COOKIE_NAME = app_default("AUTH_COOKIE_NAME", "access_token")
    CSRF_COOKIE_NAME = app_default("CSRF_COOKIE_NAME", "csrf_token")
    COOKIE_SECURE = env_bool("COOKIE_SECURE", not IS_DEVELOPMENT)
    COOKIE_SAMESITE = (os.getenv("COOKIE_SAMESITE") or "lax").lower()
    AUTH_RATE_LIMIT_ATTEMPTS = app_default("AUTH_RATE_LIMIT_ATTEMPTS", 10)
    AUTH_RATE_LIMIT_WINDOW_SECONDS = app_default("AUTH_RATE_LIMIT_WINDOW_SECONDS", 300)
    OTP_RATE_LIMIT_ATTEMPTS = app_default("OTP_RATE_LIMIT_ATTEMPTS", 10)
    OTP_RATE_LIMIT_WINDOW_SECONDS = app_default("OTP_RATE_LIMIT_WINDOW_SECONDS", 300)
    EXPOSE_DEV_OTP = env_bool("EXPOSE_DEV_OTP", IS_DEVELOPMENT)
    DEFAULT_PAGE_SIZE = app_default("DEFAULT_PAGE_SIZE", 10)
    MAX_PAGE_SIZE = app_default("MAX_PAGE_SIZE", 100)
    SECRET_KEY = os.getenv("SECRET_KEY")
    if not SECRET_KEY:
        raise RuntimeError("SECRET_KEY environment variable is required")
    ALGORITHM = app_default("JWT_ALGORITHM", "HS256")
    LOW_STOCK_CHECK = app_default("LOW_STOCK_CHECK", 5)
    OUT_OF_STOCK_CHECK = app_default("OUT_OF_STOCK_CHECK", 0)
    API_LOG_TTL_DAYS = app_default("API_LOG_TTL_DAYS", 1)
    PASSWORD_RESET_OTP_EXPIRE_MINUTES = app_default("PASSWORD_RESET_OTP_EXPIRE_MINUTES", 10)
    PASSWORD_RESET_TOKEN_EXPIRE_MINUTES = app_default("PASSWORD_RESET_TOKEN_EXPIRE_MINUTES", 10)
    PASSWORD_RESET_MAX_ATTEMPTS = app_default("PASSWORD_RESET_MAX_ATTEMPTS", 5)
    PASSWORD_RESET_RESEND_COOLDOWN_SECONDS = app_default("PASSWORD_RESET_RESEND_COOLDOWN_SECONDS", 60)
    ADMIN_OTP_EXPIRE_MINUTES = app_default("ADMIN_OTP_EXPIRE_MINUTES", 5)
    ADMIN_OTP_MAX_ATTEMPTS = app_default("ADMIN_OTP_MAX_ATTEMPTS", 5)
    ADMIN_OTP_RESEND_COOLDOWN_SECONDS = app_default("ADMIN_OTP_RESEND_COOLDOWN_SECONDS", 60)
    ADMIN_VERIFICATION_MINUTES = app_default("ADMIN_VERIFICATION_MINUTES", 20)
    BULK_UPLOAD_MAX_FILE_SIZE_MB = app_default("BULK_UPLOAD_MAX_FILE_SIZE_MB", 5)
    BULK_UPLOAD_MAX_ROWS = app_default("BULK_UPLOAD_MAX_ROWS", 51)
    BULK_UPLOAD_MAX_UNCOMPRESSED_MB = app_default("BULK_UPLOAD_MAX_UNCOMPRESSED_MB", 25)
    MAX_IMAGE_PIXELS = app_default("MAX_IMAGE_PIXELS", 20_000_000)
    MAX_REQUEST_BODY_BYTES = app_default("MAX_REQUEST_BODY_BYTES", 1_048_576)
    MAX_REQUEST_TARGET_BYTES = app_default("MAX_REQUEST_TARGET_BYTES", 8_192)
    MAX_REQUEST_HEADER_BYTES = app_default("MAX_REQUEST_HEADER_BYTES", 32_768)
    LOYALTY_REQUIRED_ORDER_COUNT = app_default("LOYALTY_REQUIRED_ORDER_COUNT", 5)
    LOYALTY_MAX_DISQUALIFIED_ORDERS = app_default("LOYALTY_MAX_DISQUALIFIED_ORDERS", 3)
    LOYALTY_REF_LENGTH = app_default("LOYALTY_REF_LENGTH", 10)
    LOYALTY_DISCOUNT_TYPE = app_default("LOYALTY_DISCOUNT_TYPE", "PERCENTAGE")
    LOYALTY_DISCOUNT_VALUE = app_default("LOYALTY_DISCOUNT_VALUE", 10)
    SMTP_HOST = os.getenv("SMTP_HOST")
    SMTP_PORT = env_int("SMTP_PORT", 587)
    SMTP_USERNAME = os.getenv("SMTP_USERNAME")
    SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
    SMTP_FROM_EMAIL = os.getenv("SMTP_FROM_EMAIL") or SMTP_USERNAME
    SMTP_FROM_NAME = app_default("SMTP_FROM_NAME", DEFAULT_BRAND_NAME)
    SMTP_USE_TLS = os.getenv("SMTP_USE_TLS", "true").lower() == "true"
    UPLOAD_DIR = os.getenv("UPLOAD_DIR", "uploads")
    ALLOWED_ORIGINS = env_list("ALLOWED_ORIGINS")
    IST = ZoneInfo("Asia/Kolkata")

    @classmethod
    def validate_security_configuration(cls):
        errors = []

        if cls.COOKIE_SAMESITE not in {"lax", "strict", "none"}:
            errors.append("COOKIE_SAMESITE must be one of: lax, strict, none")
        if cls.COOKIE_SAMESITE == "none" and not cls.COOKIE_SECURE:
            errors.append("COOKIE_SECURE must be true when COOKIE_SAMESITE=none")
        if not cls.IS_DEVELOPMENT and not cls.COOKIE_SECURE:
            errors.append("COOKIE_SECURE must be true outside development/test")

        cookie_name_pattern = re.compile(r"^[!#$%&'*+.^_`|~0-9A-Za-z-]+$")
        for setting_name, cookie_name in (
            ("AUTH_COOKIE_NAME", cls.AUTH_COOKIE_NAME),
            ("CSRF_COOKIE_NAME", cls.CSRF_COOKIE_NAME),
        ):
            if not cookie_name_pattern.fullmatch(cookie_name):
                errors.append(f"{setting_name} is not a valid cookie name")
        if cls.AUTH_COOKIE_NAME == cls.CSRF_COOKIE_NAME:
            errors.append("AUTH_COOKIE_NAME and CSRF_COOKIE_NAME must be different")

        algorithm = cls.ALGORITHM.strip().upper()
        minimum_secret_bytes = {"HS256": 32, "HS384": 48, "HS512": 64}
        if algorithm not in minimum_secret_bytes:
            errors.append("ALGORITHM must be one of: HS256, HS384, HS512")
        elif len(cls.SECRET_KEY.encode("utf-8")) < minimum_secret_bytes[algorithm]:
            errors.append(
                f"SECRET_KEY must be at least {minimum_secret_bytes[algorithm]} bytes for {algorithm}"
            )
        cls.ALGORITHM = algorithm

        if len(set(cls.ALLOWED_ORIGINS)) != len(cls.ALLOWED_ORIGINS):
            errors.append("ALLOWED_ORIGINS must not contain duplicate origins")

        for origin in cls.ALLOWED_ORIGINS:
            parsed = urlsplit(origin)
            if origin == "*":
                errors.append("ALLOWED_ORIGINS must not contain a wildcard")
            elif (
                parsed.scheme not in {"http", "https"}
                or not parsed.netloc
                or parsed.username is not None
                or parsed.password is not None
                or parsed.path
                or parsed.query
                or parsed.fragment
            ):
                errors.append(f"Invalid origin in ALLOWED_ORIGINS: {origin!r}")
            elif not cls.IS_DEVELOPMENT and parsed.scheme != "https":
                errors.append(
                    f"Production origins must use HTTPS: {origin!r}"
                )

        if errors:
            raise RuntimeError(
                "Invalid security configuration:\n- " + "\n- ".join(errors)
            )
