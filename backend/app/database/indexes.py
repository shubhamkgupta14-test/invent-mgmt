from app.database.mongodb import db
from app.utils.settings import Settings


async def create_indexes():

    await db.users.create_index(
        "username",
        unique=True
    )

    await db.users.create_index(
        "email",
        unique=True,
        sparse=True
    )

    await db.users.create_index(
        "created_at"
    )

    await db.products.create_index(
        "sku",
        unique=True
    )

    await db.products.create_index(
        "created_at"
    )

    await db.stocks.create_index(
        "barcode",
        unique=True,
        sparse=True
    )

    await db.suppliers.create_index(
        "supplier_id",
        unique=True
    )

    await db.suppliers.create_index(
        "created_at"
    )
    await db.suppliers.create_index(
        "system_key",
        unique=True,
        sparse=True
    )

    await db.notifications.create_index("created_at")
    await db.notifications.create_index("system_key", sparse=True)
    await db.notification_reads.create_index(
        [("notification_id", 1), ("username", 1)],
        unique=True
    )
    await db.returns.create_index("return_id", unique=True, sparse=True)
    await db.exchanges.create_index("exchange_id", unique=True, sparse=True)

    sales_indexes = await db.sales.index_information()
    invoice_index = sales_indexes.get("invoice_id_1")
    if invoice_index and invoice_index.get("unique"):
        await db.sales.drop_index("invoice_id_1")
    await db.sales.create_index("invoice_id")

    invoice_indexes = await db.invoices.index_information()
    invoice_id_index = invoice_indexes.get("invoice_id_1")
    if invoice_id_index and not invoice_id_index.get("unique"):
        await db.invoices.drop_index("invoice_id_1")
    await db.invoices.create_index("invoice_id", unique=True)
    await db.invoices.create_index("invoice_sequence", unique=True, sparse=True)
    await db.invoices.create_index("created_at")
    await db.invoice_counters.create_index("config_key", unique=True)

    loyalty_indexes = await db.loyalty.index_information()
    email_index = loyalty_indexes.get("email_1")
    if email_index and email_index.get("unique"):
        await db.loyalty.drop_index("email_1")
    await db.loyalty.create_index("ref_no", unique=True)
    await db.loyalty.create_index(
        "email",
        unique=True,
        name="active_email_unique",
        partialFilterExpression={"status": {"$in": ["PENDING", "ELIGIBLE"]}},
    )
    await db.loyalty.create_index("status")
    await db.loyalty.create_index("created_at")
    await db.loyalty.create_index("orders.order_id", unique=True, sparse=True)
    manufacturing_indexes = await db.manufacturing.index_information()
    if "lot_no_1" in manufacturing_indexes:
        await db.manufacturing.drop_index("lot_no_1")
    if "batch_no_1" in manufacturing_indexes:
        await db.manufacturing.drop_index("batch_no_1")

    await db.manufacturing.create_index("batch_no", unique=True)
    await db.manufacturing.create_index("created_at")

    api_log_indexes = await db.api_logs.index_information()
    if "created_at_1" in api_log_indexes:
        await db.api_logs.drop_index("created_at_1")
    if "trace_id_1" in api_log_indexes:
        await db.api_logs.drop_index("trace_id_1")

    await db.api_logs.create_index(
        "created_at",
        expireAfterSeconds=Settings.API_LOG_TTL_DAYS * 24 * 60 * 60
    )
    await db.api_logs.create_index("trace_id", unique=True)
    await db.api_logs.create_index("path")
    await db.api_logs.create_index("status_code")
    await db.api_logs.create_index("duration_ms")

    await db.password_otps.create_index("user_id")
    await db.password_otps.create_index("username")
    await db.password_otps.create_index("email")
    await db.password_otps.create_index("status")
    await db.password_otps.create_index("expires_at")
    await db.password_otps.create_index("reset_token_hash", sparse=True)

    await db.company_settings.create_index("settings_key", unique=True)
    await db.app_config.create_index("config_key", unique=True)
