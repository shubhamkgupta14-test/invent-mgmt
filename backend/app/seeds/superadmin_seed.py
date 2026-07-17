from app.database.mongodb import db
import os
from datetime import datetime
from app.models.auth import UserRole
from app.utils.helpers import hash_password
from app.models.auth import validate_strong_password
from app.utils.settings import Settings
from app.services.company_service import company_settings_collection, SETTINGS_KEY
from app.services.supplier_service import ensure_own_company_supplier

users_collection = db.users


async def create_default_superadmin():
    existing_superadmin = await users_collection.find_one({
        "role": UserRole.SUPERADMIN
    })

    username = os.getenv("SUPERADMIN_USERNAME")
    password = os.getenv("SUPERADMIN_PASSWORD")
    email = os.getenv("SUPERADMIN_EMAIL") or "superadmin@example.com"
    firstname = "Super"
    lastname = "Admin"

    if not existing_superadmin:
        if not username or not password:
            raise RuntimeError(
                "SUPERADMIN_USERNAME and SUPERADMIN_PASSWORD must be set before creating the first superadmin"
            )
        validate_strong_password(password)

        superadmin_data = {
            "username": username,
            "password": hash_password(password),
            "firstname": firstname,
            "lastname": lastname,
            "email": email,
            "role": UserRole.SUPERADMIN,
            "active": True,
            "token_version": 0,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }

        result = await users_collection.insert_one(
            superadmin_data
        )
        superadmin_user = {**superadmin_data, "_id": result.inserted_id}
    else:
        superadmin_user = existing_superadmin

    company_settings = await company_settings_collection.find_one({"settings_key": SETTINGS_KEY})
    await ensure_own_company_supplier(company_settings, superadmin_user)
    return True
