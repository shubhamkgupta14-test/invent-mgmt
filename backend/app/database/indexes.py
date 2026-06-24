from app.database.mongodb import db


async def create_indexes():

    await db.users.create_index(
        "username",
        unique=True
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
