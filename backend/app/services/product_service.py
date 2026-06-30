from app.utils.messages import Messages
from datetime import datetime, UTC

from app.database.mongodb import db
from app.utils.helpers import normalize_product_name, normalize_sku
from app.utils.responseBuilder import build_product_response
from app.utils.pagination import paginate_collection, regex_filter, validate_sort_field
from app.models.auth import UserRole
from app.core.exceptions import (
    forbidden,
    not_found,
    bad_request,
    conflict
)

products_collection = db.products
suppliers_collection = db.suppliers


# CREATE PRODUCT
async def add_product(product_data: dict, auth_user: dict):
    sku = normalize_sku(product_data.get("sku"))
    product_data["name"] = normalize_product_name(product_data.get("name"))

    if auth_user.get("role") == UserRole.USER:
        forbidden()

    # Check duplicate SKU
    existing_product = await products_collection.find_one({
        "sku": sku
    })

    if existing_product:
        conflict(Messages.PRODUCT_ALREADY_EXISTS)

    supplier_id = product_data.get("supplier_id", "").strip()
    if not supplier_id:
        bad_request(Messages.INVALID_SUPPLIER_ID)
    product_data["supplier_id"] = supplier_id

    supplier = await suppliers_collection.find_one({
        "supplier_id": supplier_id
    })
    if not supplier:
        bad_request(Messages.INVALID_SUPPLIER_ID)

    product_data["created_at"] = datetime.now(UTC)
    product_data["updated_at"] = datetime.now(UTC)
    product_data["is_active"] = True
    product_data["is_manufactured"] = bool(product_data.get("is_manufactured", False))
    product_data["sku"] = sku

    result = await products_collection.insert_one(product_data)

    created_product = await products_collection.find_one({
        "_id": result.inserted_id
    })

    return build_product_response(created_product)


# GET ALL PRODUCTS
async def get_all_products(
    auth_user: dict,
    search: str = None,
    sort_by: str = "created_at",
    order: str = "desc",
    page: int = 1,
    limit: int = 10
):
    allowed_sort_fields = [
        "created_at",
        "updated_at",
        "sku",
        "name",
        "category",
        "supplier_id",
        "tax_rate",
        "reorder_level",
        "is_active",
    ]
    validate_sort_field(sort_by, allowed_sort_fields)

    # superadmin can get all products, while admin and users can get active products
    if auth_user.get("role") == UserRole.SUPERADMIN:
        filters = {}

    elif auth_user.get("role") in [UserRole.ADMIN, UserRole.USER]:
        filters = {"is_active": True}

    else:
        forbidden()

    filters.update(regex_filter(search, ["sku", "name", "category", "supplier_id"]))

    return await paginate_collection(
        products_collection,
        filters,
        sort_by,
        order,
        page,
        limit,
        build_product_response,
    )


async def get_product_options(auth_user: dict, active_only: bool = False):
    filters = {}

    if active_only or auth_user.get("role") in [UserRole.ADMIN, UserRole.USER]:
        filters["is_active"] = True
    elif auth_user.get("role") != UserRole.SUPERADMIN:
        forbidden()

    products = []
    async for product in products_collection.find(
        filters,
        {"_id": 0, "sku": 1, "name": 1, "category": 1, "tax_rate": 1, "is_manufactured": 1}
    ).sort("name", 1):
        products.append({
            "sku": product.get("sku"),
            "name": product.get("name"),
            "category": product.get("category"),
            "tax_rate": product.get("tax_rate", 0),
            "is_manufactured": product.get("is_manufactured", False)
        })

    return products


async def get_product_form_options(auth_user: dict):
    product_filters = {}
    supplier_filters = {}

    if auth_user.get("role") in [UserRole.ADMIN, UserRole.USER]:
        product_filters["is_active"] = True
        supplier_filters["is_active"] = True
    elif auth_user.get("role") != UserRole.SUPERADMIN:
        forbidden()

    categories = await products_collection.distinct(
        "category",
        product_filters
    )

    suppliers = []
    async for supplier in suppliers_collection.find(
        supplier_filters,
        {"_id": 0, "supplier_id": 1, "name": 1}
    ).sort("name", 1):
        suppliers.append({
            "supplier_id": supplier.get("supplier_id"),
            "name": supplier.get("name")
        })

    return {
        "categories": sorted([category for category in categories if category]),
        "suppliers": suppliers,
        "units": ["pcs", "kg", "g", "m", "cm", "ltr", "ml", "other"]
    }


# GET SINGLE PRODUCT
async def get_product_by_sku(sku: str, auth_user: dict):
    sku = normalize_sku(sku)

    if not sku:
        bad_request(Messages.INVALID_SKU)

    product = await products_collection.find_one({
        "sku": sku
    })

    if not product:
        not_found(Messages.PRODUCT_NOT_FOUND)

    if auth_user.get("role") == UserRole.SUPERADMIN:
        return build_product_response(product)

    if auth_user.get("role") in [UserRole.ADMIN, UserRole.USER]:

        if not product.get("is_active"):
            forbidden()
        return build_product_response(product)

    forbidden()


# UPDATE PRODUCT
async def update_product_by_sku(sku: str, update_data: dict, auth_user: dict):

    if auth_user.get("role") == UserRole.USER:
        forbidden()

    sku = normalize_sku(sku)

    if not sku:
        bad_request(Messages.INVALID_SKU)

    existing_product = await products_collection.find_one({
        "sku": sku
    })

    if not existing_product:
        not_found(Messages.PRODUCT_NOT_FOUND)

    if (
        auth_user.get("role") == UserRole.ADMIN
        and not existing_product.get("is_active")
    ):
        forbidden()

    if "name" in update_data:
        update_data["name"] = normalize_product_name(update_data.get("name"))

    supplier_id = update_data.get("supplier_id")
    if supplier_id is not None:
        supplier = await suppliers_collection.find_one({
            "supplier_id": supplier_id
        })
        if not supplier:
            bad_request(Messages.INVALID_SUPPLIER_ID)

    update_data["updated_at"] = datetime.now(UTC)

    await products_collection.update_one(
        {"sku": sku},
        {"$set": update_data}
    )

    updated_product = await products_collection.find_one({
        "sku": sku
    })

    return build_product_response(updated_product)


# DELETE PRODUCT
async def delete_product_by_sku(sku: str, auth_user: dict):
    if auth_user.get("role") == UserRole.USER:
        forbidden()

    sku = normalize_sku(sku)

    if not sku:
        bad_request(Messages.INVALID_SKU)

    existing_product = await products_collection.find_one({"sku": sku})

    if not existing_product:
        not_found(Messages.PRODUCT_NOT_FOUND)

    if auth_user.get("role") == UserRole.SUPERADMIN:
        if not existing_product.get("is_active"):
            await products_collection.delete_one({"sku": sku})
            return Messages.PRODUCT_DELETED_PERMANENTLY

        await products_collection.update_one(
            {"sku": sku},
            {"$set": {
                "is_active": False,
                "updated_at": datetime.now(UTC)
            }}
        )
        return Messages.PRODUCT_DELETED

    if auth_user.get("role") == UserRole.ADMIN:
        if not existing_product.get("is_active"):
            bad_request(Messages.PRODUCT_INACTIVE)

        await products_collection.update_one(
            {"sku": sku},
            {"$set": {
                "is_active": False,
                "updated_at": datetime.now(UTC)
            }}
        )
        return Messages.PRODUCT_DELETED

    forbidden()
 

async def filter_products_service(
    sku=None, name=None, category=None,
    supplier_id=None, is_active=None, auth_user=None
):
    filters = {}
    products = []

    if auth_user.get("role") != UserRole.SUPERADMIN:
        if is_active is None:
            filters["is_active"] = True

        elif not is_active:
            return products

        filters["is_active"] = True

    else:
        if is_active is not None:
            filters["is_active"] = is_active

    if sku:
        filters["sku"] = normalize_sku(sku)

    if name:
        filters["name"] = normalize_product_name(name)

    if category:
        filters["category"] = category

    if supplier_id:
        filters["supplier_id"] = supplier_id

    async for product in products_collection.find(filters).sort("created_at", -1):
        products.append(
            build_product_response(product)
        )

    return products
