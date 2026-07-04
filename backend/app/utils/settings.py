import os
from pathlib import Path
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


class Settings:
    DEFAULT_BRAND_NAME = "E-Store"
    ENVIRONMENT = os.getenv("ENVIRONMENT") or "dev"
    ACCESS_TOKEN_EXPIRE_MINUTES = 30
    TOKEN_TYPE = "bearer"
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
