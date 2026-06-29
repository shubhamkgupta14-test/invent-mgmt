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

    username = os.getenv("SUPERADMIN_USERNAME")
    password = os.getenv("SUPERADMIN_PASSWORD")
    email = os.getenv("SUPERADMIN_EMAIL") or "superadmin@example.com"
    firstname = os.getenv("SUPERADMIN_FIRSTNAME") or "Super"
    lastname = os.getenv("SUPERADMIN_LASTNAME") or "Admin"

    if not existing_superadmin:
        if not username or not password:
            raise RuntimeError(
                "SUPERADMIN_USERNAME and SUPERADMIN_PASSWORD must be set before creating the first superadmin"
            )

        superadmin_data = {
            "username": username,
            "password": hash_password(password),
            "firstname": firstname,
            "lastname": lastname,
            "email": email,
            "role": UserRole.SUPERADMIN,
            "active": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }

        await users_collection.insert_one(
            superadmin_data
        )
    return True
