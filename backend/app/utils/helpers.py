from bson import ObjectId
from passlib.context import CryptContext
from math import ceil
from app.utils.settings import Settings
from datetime import timezone


def serialize_mongo_document(document):
    if not document:
        return None
    document["id"] = str(document["_id"])
    del document["_id"]
    document.pop("password", None)
    return document


def is_valid_object_id(id: str):
    return ObjectId.is_valid(id)


def normalize_sku(sku: str):
    if not isinstance(sku, str):
        return ""
    sku = sku.strip().upper()
    return "-".join(sku.split())


def normalize_product_name(name: str):
    if not isinstance(name, str):
        return ""
    return " ".join(name.strip().split()).title()


def normalize_username(username: str):
    return username.strip().lower()


def hash_password(password: str):
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    return pwd_context.hash(password)


def round_price(value: float):
    return round(value, 2)


def round_final_amount(value: float):
    return float(ceil(value))


def format_datetime_ist(dt):
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)

    return dt.astimezone(Settings.IST).strftime(
        "%Y-%m-%dT%H:%M:%S IST"
    )


def format_datetime_iso(dt):
    return dt.isoformat()


async def generate_supplier_id(db):
    last_supplier = await db.suppliers.find_one(
        {},
        sort=[("supplier_id", -1)]
    )
    if not last_supplier:
        return "SUP-0001"

    last_id = last_supplier["supplier_id"]

    number = int(
        last_id.split("-")[1]
    ) + 1

    return f"SUP-{number:04d}"
