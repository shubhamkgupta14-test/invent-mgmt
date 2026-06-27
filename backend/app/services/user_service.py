from datetime import datetime, UTC

from app.database.mongodb import db
from app.utils.helpers import (
    hash_password,
    normalize_username
)
from app.utils.responseBuilder import build_user_response

from app.models.auth import UserRole
from app.utils.messages import Messages
from app.core.exceptions import (
    forbidden,
    conflict,
    not_found,
    bad_request
)

user_collection = db.users

SUPERADMIN_CLEANABLE_COLLECTIONS = {
    "products": db.products,
    "purchases": db.purchases,
    "sales": db.sales,
    "returns": db.returns,
    "exchanges": db.exchanges,
    "stocks": db.stocks,
    "suppliers": db.suppliers,
    "audits": db.audits,
    "users": db.users,
}

# CREATE USER


async def create_user(auth_user: dict, user_data: dict):
    username = normalize_username(user_data.get("username"))
    email = user_data.get("email", "").strip().lower()

    if auth_user.get("role") != UserRole.SUPERADMIN:
        forbidden()

    # Check duplicate username
    existing_user = await user_collection.find_one({
        "username": username
    })

    if existing_user:
        conflict(Messages.USER_ALREADY_PRESENT)

    existing_email = await user_collection.find_one({
        "email": email
    })

    if existing_email:
        conflict(Messages.USER_ALREADY_PRESENT)

    user_data["username"] = username
    user_data["email"] = email
    user_data["firstname"] = user_data.get("firstname", "").strip().title()
    user_data["lastname"] = (user_data.get("lastname") or "").strip().title()
    user_data["created_at"] = datetime.now(UTC)
    user_data["updated_at"] = datetime.now(UTC)
    user_data["active"] = user_data.get("active", True)
    user_data["password"] = hash_password(user_data.get("password"))

    result = await user_collection.insert_one(user_data)

    created_user = await user_collection.find_one({
        "_id": result.inserted_id
    })

    return build_user_response(created_user)


# GET USER BY USERNAME
async def get_user_by_username(auth_user: dict, username: str):

    username = normalize_username(username)

    # USER ROLE VALIDATION
    if auth_user.get("role") == UserRole.USER:

        if auth_user.get("username") != username:
            forbidden()

    user = await user_collection.find_one({
        "username": username
    })

    if not user:
        not_found(Messages.USER_NOT_FOUND)

    # SUPERADMIN
    if auth_user.get("role") == UserRole.SUPERADMIN:
        return build_user_response(user)

    # ADMIN
    if auth_user.get("role") == UserRole.ADMIN:

        # own profile
        if auth_user.get("username") == username:
            return build_user_response(user)

        # only active USER accounts allowed
        if (
            user.get("role") != UserRole.USER
            or not user.get("active")
        ):
            forbidden()

        return build_user_response(user)

    # USER
    return build_user_response(user)


# GET ME

async def get_me(auth_user: dict):
    if not auth_user:
        forbidden()
    username = normalize_username(auth_user.get("username"))
    user = await user_collection.find_one({
        "username": username
    })
    return build_user_response(user)

# GET ALL USERS


async def get_all_users(auth_user: dict):

    users = []
    # superadmin can view all users including inactive users, superadmin and admin users
    # admin can view only active users and cannot view other admin and superadmin users, also can view own details
    # users cannot view all users.

    if auth_user.get("role") == UserRole.SUPERADMIN:
        async for user in user_collection.find({}).sort("created_at", -1):
            users.append(
                build_user_response(user)
            )

        return users

    if auth_user.get("role") == UserRole.ADMIN:
        async for user in user_collection.find({
            "$or": [
                {
                    "username": auth_user.get("username")
                },
                {
                    "active": True,
                    "role": UserRole.USER
                }
            ]
        }).sort("created_at", -1):
            users.append(
                build_user_response(user)
            )

        return users

    forbidden()

# DELETE USER SOFT AND PERMANENT


async def activate_user(auth_user: dict, username: str):
    username = normalize_username(username)

    if auth_user.get("role") != UserRole.SUPERADMIN:
        forbidden()

    existing_user = await user_collection.find_one({
        "username": username,
    })

    if not existing_user:
        not_found(Messages.USER_NOT_FOUND)

    if existing_user.get("active"):
        bad_request(Messages.ACCESS_DENIED)

    await user_collection.update_one({
        "username": username
    }, {
        "$set": {
            "active": True,
            "updated_at": datetime.now(UTC)
        }
    })

    updated_user = await user_collection.find_one({
        "username": username
    })

    return build_user_response(updated_user)


async def delete_user(auth_user: dict, username: str, permanent: bool = False):
    # only superadmin can delete users, no other role can delete
    username = normalize_username(username)

    if auth_user.get("role") != UserRole.SUPERADMIN:
        forbidden()

    existing_user = await user_collection.find_one({
        "username": username,
    })

    if not existing_user:
        not_found(Messages.USER_NOT_FOUND)

    # PREVENT SELF DELETE
    if auth_user.get("username") == username:
        bad_request(Messages.USER_SELF_DELETE_NOT_ALLOWED)

    # PREVENT SUPERADMIN DELETE
    if existing_user.get("role") == UserRole.SUPERADMIN:
        bad_request(Messages.SUPERADMIN_DELETE_NOT_ALLOWED)

    if permanent:
        if existing_user.get("active"):
            bad_request(Messages.USER_DEACTIVATION_REQUIRED)

        await user_collection.delete_one({
            "username": username
        })

        return Messages.USER_DELETED_PERMANENTLY

    if not existing_user.get("active"):
        bad_request(Messages.USER_INACTIVE)

    await user_collection.update_one({
        "username": username
    }, {
        "$set": {
            "active": False,
            "updated_at": datetime.now(UTC)
        }
    })
    return Messages.USER_DELETED


async def update_user_role(auth_user: dict, username: str, role: UserRole):
    username = normalize_username(username)

    if auth_user.get("role") != UserRole.SUPERADMIN:
        forbidden()

    if auth_user.get("username") == username:
        bad_request(Messages.ACCESS_DENIED)

    existing_user = await user_collection.find_one({
        "username": username
    })

    if not existing_user:
        not_found(Messages.USER_NOT_FOUND)

    if not existing_user.get("active"):
        bad_request(Messages.USER_INACTIVE)

    if existing_user.get("role") == UserRole.SUPERADMIN and role != UserRole.SUPERADMIN:
        superadmin_count = await user_collection.count_documents({
            "role": UserRole.SUPERADMIN,
            "active": True
        })
        if superadmin_count <= 1:
            bad_request(Messages.ACCESS_DENIED)

    await user_collection.update_one({
        "username": username
    }, {
        "$set": {
            "role": role,
            "updated_at": datetime.now(UTC)
        }
    })

    updated_user = await user_collection.find_one({
        "username": username
    })

    return build_user_response(updated_user)


async def clean_database_collections(auth_user: dict, collections: list[str]):
    if auth_user.get("role") != UserRole.SUPERADMIN:
        forbidden()

    selected_collections = list(dict.fromkeys(collections))
    invalid_collections = [
        collection for collection in selected_collections
        if collection not in SUPERADMIN_CLEANABLE_COLLECTIONS
    ]

    if invalid_collections:
        bad_request(Messages.INVALID_COLLECTION)

    result = {}

    for collection_name in selected_collections:
        collection = SUPERADMIN_CLEANABLE_COLLECTIONS[collection_name]

        if collection_name == "users":
            delete_result = await collection.delete_many({
                "username": {"$ne": auth_user.get("username")}
            })
        else:
            delete_result = await collection.delete_many({})

        result[collection_name] = delete_result.deleted_count

    return result
