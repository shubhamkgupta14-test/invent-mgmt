from app.database.mongodb import db
import os
from datetime import datetime
from app.models.auth import UserRole
from app.utils.helpers import hash_password
from app.utils.settings import Settings

users_collection = db.users


async def create_default_superadmin():
    existing_superadmin = await users_collection.find_one({
        "role": UserRole.SUPERADMIN
    })

    username = os.getenv(
        "SUPERADMIN_USERNAME") or Settings.DEFAULT_SUPERADMIN_USERNAME
    password = os.getenv(
        "SUPERADMIN_PASSWORD") or Settings.DEFAULT_SUPERADMIN_PASSWORD

    if not existing_superadmin:
        superadmin_data = {
            "username": username,
            "password": hash_password(password),
            "role": UserRole.SUPERADMIN,
            "active": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }

        await users_collection.insert_one(
            superadmin_data
        )
    return True
