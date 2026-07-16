"""Mongo collection names exposed to the superadmin cleanup tool."""

CLEANABLE_COLLECTIONS = {
    "api-logs": "api_logs",
    "app-config": "app_config",
    "auth-sessions": "auth_sessions",
    "audits": "audits",
    "company-settings": "company_settings",
    "exchanges": "exchanges",
    "invoice-counters": "invoice_counters",
    "invoices": "invoices",
    "loyalty": "loyalty",
    "manufacturing": "manufacturing",
    "mailer": "mail_messages",
    "notification-reads": "notification_reads",
    "notifications": "notifications",
    "otp-records": "password_otps",
    "products": "products",
    "purchases": "purchases",
    "returns": "returns",
    "sales": "sales",
    "stocks": "stocks",
    "suppliers": "suppliers",
    "users": "users",
}

# Destructive master/transaction data is deliberately not selected by default.
DEFAULT_CLEANABLE_COLLECTIONS = (
    "api-logs",
    "audits",
    "mailer",
    "notification-reads",
    "notifications",
    "otp-records",
)
