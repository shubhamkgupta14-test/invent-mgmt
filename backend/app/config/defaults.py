"""Non-secret application defaults.

Change ordinary application behaviour here. Environment variables are reserved
for secrets and values that genuinely differ between deployments.
"""


class AppDefaults:
    DEFAULT_BRAND_NAME = "E-Store"
    JWT_ALGORITHM = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES = 30
    TOKEN_TYPE = "bearer"
    AUTH_COOKIE_NAME = "access_token"
    CSRF_COOKIE_NAME = "csrf_token"

    AUTH_RATE_LIMIT_ATTEMPTS = 10
    AUTH_RATE_LIMIT_WINDOW_SECONDS = 300
    OTP_RATE_LIMIT_ATTEMPTS = 10
    OTP_RATE_LIMIT_WINDOW_SECONDS = 300

    DEFAULT_PAGE_SIZE = 10
    MAX_PAGE_SIZE = 100
    LOW_STOCK_CHECK = 5
    OUT_OF_STOCK_CHECK = 0
    API_LOG_TTL_DAYS = 1

    PASSWORD_RESET_OTP_EXPIRE_MINUTES = 10
    PASSWORD_RESET_TOKEN_EXPIRE_MINUTES = 10
    PASSWORD_RESET_MAX_ATTEMPTS = 5
    PASSWORD_RESET_RESEND_COOLDOWN_SECONDS = 60

    BULK_UPLOAD_MAX_FILE_SIZE_MB = 5
    BULK_UPLOAD_MAX_ROWS = 51
    BULK_UPLOAD_MAX_UNCOMPRESSED_MB = 25
    MAX_IMAGE_PIXELS = 20_000_000
    MAX_REQUEST_BODY_BYTES = 1_048_576
    MAX_REQUEST_TARGET_BYTES = 8_192
    MAX_REQUEST_HEADER_BYTES = 32_768

    LOYALTY_REQUIRED_ORDER_COUNT = 5
    LOYALTY_MAX_DISQUALIFIED_ORDERS = 3
    LOYALTY_REF_LENGTH = 10
    LOYALTY_DISCOUNT_TYPE = "PERCENTAGE"
    LOYALTY_DISCOUNT_VALUE = 10

    SMTP_FROM_NAME = DEFAULT_BRAND_NAME


def app_default(name: str, fallback):
    """Read the global config first and retain a safe code fallback."""
    return getattr(AppDefaults, name, fallback)
