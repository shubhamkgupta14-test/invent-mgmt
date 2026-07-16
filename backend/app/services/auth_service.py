from jose import jwt, JWTError
import hmac
from bson import ObjectId
from datetime import datetime, timedelta, timezone
from passlib.context import CryptContext
from fastapi import Request
from app.database.mongodb import db
from app.utils.settings import Settings
from app.utils.messages import Messages
from app.models.auth import UserRole
from app.utils.helpers import normalize_username
from app.core.exceptions import (
    unauthorized,
    forbidden,
    forbidden_or_expired
)

SECRET_KEY = Settings.SECRET_KEY
ALGORITHM = Settings.ALGORITHM

bcrypt_context = CryptContext(schemes=['bcrypt'], deprecated='auto')

user_collection = db.users


async def authenticate_user(username: str, password: str, user_collection):
    username = normalize_username(username)

    user = await user_collection.find_one({"username": username})

    if not user:
        return False

    if not bcrypt_context.verify(password, user.get("password", "")):
        return False

    return user


async def get_current_user(request: Request):
    token = request.cookies.get(Settings.AUTH_COOKIE_NAME)
    if not token:
        forbidden_or_expired()

    if request.method.upper() not in {"GET", "HEAD", "OPTIONS"}:
        csrf_cookie = request.cookies.get(Settings.CSRF_COOKIE_NAME, "")
        csrf_header = request.headers.get("X-CSRF-Token", "")
        if not csrf_cookie or not csrf_header or not hmac.compare_digest(csrf_cookie, csrf_header):
            forbidden(Messages.ACCESS_DENIED)

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")

        if not user_id:
            forbidden_or_expired()

    except JWTError:
        forbidden_or_expired()

    user = await user_collection.find_one({"_id": ObjectId(user_id)})

    if not user:
        forbidden_or_expired()

    if not user.get("active"):
        forbidden(Messages.USER_INACTIVE)

    return {
        "user_id": user_id,
        "username": user.get("username"),
        "role": user.get("role")
    }


def create_access_token(user_id: str, username: str, role: str):
    expire = datetime.now(timezone.utc) + \
        timedelta(minutes=Settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode = {
        "sub": str(user_id),
        "username": username,
        "role": role,
        "exp": expire
    }

    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


async def get_token_service(username: str, password: str):
    username = normalize_username(username)

    user = await user_collection.find_one({"username": username})

    if not user:
        unauthorized()

    if not bcrypt_context.verify(password, user.get("password")):
        unauthorized()

    if user.get("role") not in [UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.USER]:
        unauthorized()

    if not user.get("active"):
        forbidden(Messages.USER_INACTIVE)

    token = create_access_token(
        user.get("_id"),
        user.get("username"),
        user.get("role")
    )

    return {
        "access_token": token,
        "token_type": Settings.TOKEN_TYPE
    }
