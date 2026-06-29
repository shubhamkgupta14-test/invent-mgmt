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

    await db.suppliers.create_index(
        "supplier_id",
        unique=True
    )

    await db.suppliers.create_index(
        "created_at"
    )

    await db.notifications.create_index("created_at")
    await db.notifications.create_index("system_key", sparse=True)
    await db.notification_reads.create_index(
        [("notification_id", 1), ("username", 1)],
        unique=True
    )
    await db.returns.create_index("return_id", unique=True, sparse=True)
    await db.exchanges.create_index("exchange_id", unique=True, sparse=True)
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
