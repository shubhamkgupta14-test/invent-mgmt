import os
from zoneinfo import ZoneInfo

from dotenv import load_dotenv

load_dotenv()


class Settings:
    APP_BRAND_NAME = os.getenv("APP_BRAND_NAME") or "E-Store"
    ENVIRONMENT = os.getenv("ENVIRONMENT") or os.getenv("APP_ENV") or "development"
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
    API_LOG_TTL_DAYS = int(os.getenv("API_LOG_TTL_DAYS", "15"))
    IST = ZoneInfo("Asia/Kolkata")
