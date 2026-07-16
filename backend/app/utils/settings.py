import os
import re
from pathlib import Path
from urllib.parse import urlsplit
from zoneinfo import ZoneInfo

from dotenv import load_dotenv

load_dotenv(dotenv_path=Path(__file__).resolve().parents[2] / ".env")


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
    DEFAULT_BRAND_NAME = "E-Store"
    ENVIRONMENT = os.getenv("ENVIRONMENT") or "dev"
    IS_DEVELOPMENT = ENVIRONMENT.strip().lower() in {
        "dev", "development", "local", "test"
    }
    API_DOCS_ENABLED = env_bool("API_DOCS_ENABLED", IS_DEVELOPMENT)
    ACCESS_TOKEN_EXPIRE_MINUTES = 30
    TOKEN_TYPE = "bearer"
    AUTH_COOKIE_NAME = os.getenv("AUTH_COOKIE_NAME") or "access_token"
    CSRF_COOKIE_NAME = os.getenv("CSRF_COOKIE_NAME") or "csrf_token"
    COOKIE_SECURE = env_bool("COOKIE_SECURE", not IS_DEVELOPMENT)
    COOKIE_SAMESITE = (os.getenv("COOKIE_SAMESITE") or "lax").lower()
    AUTH_RATE_LIMIT_ATTEMPTS = env_int("AUTH_RATE_LIMIT_ATTEMPTS", 10)
    AUTH_RATE_LIMIT_WINDOW_SECONDS = env_int("AUTH_RATE_LIMIT_WINDOW_SECONDS", 300)
    OTP_RATE_LIMIT_ATTEMPTS = env_int("OTP_RATE_LIMIT_ATTEMPTS", 10)
    OTP_RATE_LIMIT_WINDOW_SECONDS = env_int("OTP_RATE_LIMIT_WINDOW_SECONDS", 300)
    EXPOSE_DEV_OTP = env_bool("EXPOSE_DEV_OTP", IS_DEVELOPMENT)
    DEFAULT_PAGE_SIZE = 10
    MAX_PAGE_SIZE = 100
    SECRET_KEY = os.getenv("SECRET_KEY")
    if not SECRET_KEY:
        raise RuntimeError("SECRET_KEY environment variable is required")
    ALGORITHM = os.getenv("ALGORITHM")
    if not ALGORITHM:
        raise RuntimeError("ALGORITHM environment variable is required")
    LOW_STOCK_CHECK = 5
    OUT_OF_STOCK_CHECK = 0
    API_LOG_TTL_DAYS = env_int("API_LOG_TTL_DAYS", 1)
    PASSWORD_RESET_OTP_EXPIRE_MINUTES = env_int(
        "PASSWORD_RESET_OTP_EXPIRE_MINUTES", 10)
    PASSWORD_RESET_TOKEN_EXPIRE_MINUTES = env_int(
        "PASSWORD_RESET_TOKEN_EXPIRE_MINUTES", 10)
    PASSWORD_RESET_MAX_ATTEMPTS = env_int("PASSWORD_RESET_MAX_ATTEMPTS", 5)
    PASSWORD_RESET_RESEND_COOLDOWN_SECONDS = env_int(
        "PASSWORD_RESET_RESEND_COOLDOWN_SECONDS", 60)
    BULK_UPLOAD_MAX_FILE_SIZE_MB = env_int("BULK_UPLOAD_MAX_FILE_SIZE_MB", 5)
    BULK_UPLOAD_MAX_ROWS = env_int("BULK_UPLOAD_MAX_ROWS", 51)
    BULK_UPLOAD_MAX_UNCOMPRESSED_MB = env_int("BULK_UPLOAD_MAX_UNCOMPRESSED_MB", 25)
    MAX_IMAGE_PIXELS = env_int("MAX_IMAGE_PIXELS", 20_000_000)
    MAX_REQUEST_BODY_BYTES = env_int("MAX_REQUEST_BODY_BYTES", 1_048_576)
    MAX_REQUEST_TARGET_BYTES = env_int("MAX_REQUEST_TARGET_BYTES", 8_192)
    MAX_REQUEST_HEADER_BYTES = env_int("MAX_REQUEST_HEADER_BYTES", 32_768)
    LOYALTY_REQUIRED_ORDER_COUNT = env_int("LOYALTY_REQUIRED_ORDER_COUNT", 5)
    LOYALTY_MAX_DISQUALIFIED_ORDERS = env_int("LOYALTY_MAX_DISQUALIFIED_ORDERS", 3)
    LOYALTY_REF_LENGTH = env_int("LOYALTY_REF_LENGTH", 10)
    LOYALTY_DISCOUNT_TYPE = os.getenv("LOYALTY_DISCOUNT_TYPE") or "PERCENTAGE"
    LOYALTY_DISCOUNT_VALUE = float(os.getenv("LOYALTY_DISCOUNT_VALUE") or 10)
    SMTP_HOST = os.getenv("SMTP_HOST")
    SMTP_PORT = env_int("SMTP_PORT", 587)
    SMTP_USERNAME = os.getenv("SMTP_USERNAME")
    SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
    SMTP_FROM_EMAIL = os.getenv("SMTP_FROM_EMAIL") or SMTP_USERNAME
    SMTP_FROM_NAME = os.getenv("SMTP_FROM_NAME") or DEFAULT_BRAND_NAME
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
