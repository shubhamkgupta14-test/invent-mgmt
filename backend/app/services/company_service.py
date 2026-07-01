from datetime import datetime, UTC
from pathlib import Path
from uuid import uuid4

from fastapi import UploadFile

from app.core.exceptions import bad_request
from app.core.exceptions import forbidden
from app.database.mongodb import db
from app.models.auth import UserRole
from app.utils.helpers import format_datetime_iso
from app.utils.settings import Settings

company_settings_collection = db.company_settings

SETTINGS_KEY = "global"
DEFAULT_COMPANY_SETTINGS = {
    "settings_key": SETTINGS_KEY,
    "company_name": "",
    "brand_name": "",
    "email": "",
    "phone": "",
    "address": "",
    "gst_number": "",
    "website": "",
    "logo_url": "",
    "currency": "INR",
    "custom_fields": [],
}
ALLOWED_IMAGE_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
}
UPLOAD_DIR = Path(__file__).resolve().parents[3] / "frontend" / "public" / "uploads"


def _build_company_response(settings: dict):
    data = {**DEFAULT_COMPANY_SETTINGS, **(settings or {})}
    updated_at = data.get("updated_at")
    data.pop("_id", None)
    return {
        "company_name": data.get("company_name", ""),
        "brand_name": data.get("brand_name", ""),
        "email": data.get("email", ""),
        "phone": data.get("phone", ""),
        "address": data.get("address", ""),
        "gst_number": data.get("gst_number", ""),
        "website": data.get("website", ""),
        "logo_url": data.get("logo_url", ""),
        "currency": data.get("currency", "INR"),
        "custom_fields": data.get("custom_fields", []),
        "updated_at": format_datetime_iso(updated_at) if updated_at else None,
    }


async def get_company_brand_name():
    settings = await company_settings_collection.find_one({"settings_key": SETTINGS_KEY})
    data = {**DEFAULT_COMPANY_SETTINGS, **(settings or {})}
    return (
        (data.get("brand_name") or data.get("company_name") or Settings.DEFAULT_BRAND_NAME)
        .strip()
        or Settings.DEFAULT_BRAND_NAME
    )


async def get_company_settings(auth_user: dict):
    if auth_user.get("role") not in [UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.USER]:
        forbidden()

    settings = await company_settings_collection.find_one({"settings_key": SETTINGS_KEY})
    return _build_company_response(settings)


async def update_company_settings(auth_user: dict, settings_data: dict):
    if auth_user.get("role") != UserRole.SUPERADMIN:
        forbidden()

    now = datetime.now(UTC)
    custom_fields = []
    for field in settings_data.get("custom_fields") or []:
        label = (field.get("label") or "").strip()
        value = (field.get("value") or "").strip()
        if label and value:
            custom_fields.append({"label": label, "value": value})

    update_data = {
        **settings_data,
        "currency": (settings_data.get("currency") or "INR").upper(),
        "custom_fields": custom_fields,
        "settings_key": SETTINGS_KEY,
        "updated_at": now,
    }

    await company_settings_collection.update_one(
        {"settings_key": SETTINGS_KEY},
        {"$set": update_data},
        upsert=True,
    )

    settings = await company_settings_collection.find_one({"settings_key": SETTINGS_KEY})
    return _build_company_response(settings or update_data)


async def update_company_logo(auth_user: dict, file: UploadFile):
    if auth_user.get("role") != UserRole.SUPERADMIN:
        forbidden()

    extension = ALLOWED_IMAGE_TYPES.get(file.content_type)
    if not extension:
        bad_request("Only JPG, PNG, WEBP, or GIF images are allowed")

    contents = await file.read()
    if len(contents) > 2 * 1024 * 1024:
        bad_request("Image size must be 2MB or less")

    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    filename = f"brand-logo-{uuid4().hex}{extension}"
    target = UPLOAD_DIR / filename
    target.write_bytes(contents)

    logo_url = f"/uploads/{filename}"
    await company_settings_collection.update_one(
        {"settings_key": SETTINGS_KEY},
        {
            "$set": {
                "settings_key": SETTINGS_KEY,
                "logo_url": logo_url,
                "updated_at": datetime.now(UTC),
            }
        },
        upsert=True,
    )

    settings = await company_settings_collection.find_one({"settings_key": SETTINGS_KEY})
    return _build_company_response(settings)
