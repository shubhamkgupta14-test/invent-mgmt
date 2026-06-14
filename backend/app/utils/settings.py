from zoneinfo import ZoneInfo


class Settings:
    ACCESS_TOKEN_EXPIRE_MINUTES = 30
    TOKEN_TYPE = "bearer"
    DEFAULT_PAGE_SIZE = 10
    MAX_PAGE_SIZE = 100
    DEFAULT_SUPERADMIN_USERNAME = "sa-test"
    DEFAULT_SUPERADMIN_PASSWORD = "admin"
    SECRET_KEY = 'QZ7PYvWcTMLnKINQPWoBT6L3oEwPF-0zG-H0VltRaBUr5Pj7TSkR6w=='
    ALGORITHM = 'HS256'
    LOW_STOCK_CHECK = 5
    OUT_OF_STOCK_CHECK = 0
    IST = ZoneInfo("Asia/Kolkata")
