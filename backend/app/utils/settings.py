import os
from zoneinfo import ZoneInfo

from dotenv import load_dotenv

load_dotenv()


class Settings:
    DEFAULT_BRAND_NAME = "E-Store"
    ENVIRONMENT = os.getenv("ENVIRONMENT") or os.getenv("APP_ENV") or "dev"
    ACCESS_TOKEN_EXPIRE_MINUTES = 30
    TOKEN_TYPE = "bearer"
    DEFAULT_PAGE_SIZE = 10
    MAX_PAGE_SIZE = 100
    SECRET_KEY = os.getenv("SECRET_KEY")
    if not SECRET_KEY:
        raise RuntimeError("SECRET_KEY environment variable is required")
    ALGORITHM = os.getenv("ALGORITHM") or "HS256"
    LOW_STOCK_CHECK = 5
    OUT_OF_STOCK_CHECK = 0
    API_LOG_TTL_DAYS = int(os.getenv("API_LOG_TTL_DAYS", "7"))
    PASSWORD_RESET_OTP_EXPIRE_MINUTES = int(os.getenv("PASSWORD_RESET_OTP_EXPIRE_MINUTES", "10"))
    PASSWORD_RESET_TOKEN_EXPIRE_MINUTES = int(os.getenv("PASSWORD_RESET_TOKEN_EXPIRE_MINUTES", "10"))
    PASSWORD_RESET_MAX_ATTEMPTS = int(os.getenv("PASSWORD_RESET_MAX_ATTEMPTS", "5"))
    PASSWORD_RESET_RESEND_COOLDOWN_SECONDS = int(os.getenv("PASSWORD_RESET_RESEND_COOLDOWN_SECONDS", "60"))
    SMTP_HOST = os.getenv("SMTP_HOST")
    SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USERNAME = os.getenv("SMTP_USERNAME")
    SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
    SMTP_FROM_EMAIL = os.getenv("SMTP_FROM_EMAIL") or SMTP_USERNAME
    SMTP_FROM_NAME = os.getenv("SMTP_FROM_NAME") or DEFAULT_BRAND_NAME
    SMTP_USE_TLS = os.getenv("SMTP_USE_TLS", "true").lower() == "true"
    IST = ZoneInfo("Asia/Kolkata")
