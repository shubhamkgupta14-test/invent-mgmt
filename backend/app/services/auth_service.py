import jwt
from jwt import InvalidTokenError
import hmac
import secrets
from bson import ObjectId
from datetime import datetime, timedelta, timezone
from uuid import uuid4
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
session_collection = db.auth_sessions


def _now_naive():
    return datetime.now(timezone.utc).replace(tzinfo=None)


async def create_session(user: dict):
    now = _now_naive()
    session_id = uuid4().hex
    await session_collection.insert_one({
        "session_id": session_id,
        "admin_portal_key": secrets.token_urlsafe(7) if user.get("role") == UserRole.SUPERADMIN else None,
        "user_id": str(user.get("_id")),
        "created_at": now,
        "last_activity_at": now,
        "expires_at": now + timedelta(hours=Settings.SESSION_ABSOLUTE_TIMEOUT_HOURS),
    })
    return session_id


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
        session_id: str = payload.get("sid")

        if not user_id or not session_id:
            forbidden_or_expired()

    except InvalidTokenError:
        forbidden_or_expired()

    now = _now_naive()
    session = await session_collection.find_one({
        "session_id": session_id,
        "user_id": user_id,
    })
    if not session:
        forbidden_or_expired()
    if session.get("expires_at") <= now:
        await session_collection.delete_one({"session_id": session_id})
        forbidden_or_expired()
    idle_deadline = session.get("last_activity_at") + timedelta(
        minutes=Settings.SESSION_IDLE_TIMEOUT_MINUTES
    )
    if idle_deadline <= now:
        await session_collection.delete_one({"session_id": session_id})
        forbidden_or_expired()

    user = await user_collection.find_one({"_id": ObjectId(user_id)})

    if not user:
        forbidden_or_expired()

    if not user.get("active"):
        forbidden(Messages.USER_INACTIVE)

    if int(payload.get("ver", -1)) != int(user.get("token_version", 0)):
        forbidden_or_expired()

    await session_collection.update_one(
        {"session_id": session_id},
        {"$set": {"last_activity_at": now}},
    )

    return {
        "user_id": user_id,
        "username": user.get("username"),
        "role": user.get("role"),
        "session_id": session_id,
    }


def create_access_token(user_id: str, username: str, role: str, session_id: str, token_version: int = 0):
    issued_at = datetime.now(timezone.utc)
    expire = issued_at + \
        timedelta(minutes=Settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode = {
        "sub": str(user_id),
        "username": username,
        "role": role,
        "sid": session_id,
        "ver": int(token_version),
        "iat": issued_at,
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

    session_id = await create_session(user)
    token = create_access_token(
        user.get("_id"),
        user.get("username"),
        user.get("role"),
        session_id,
        user.get("token_version", 0),
    )

    return {
        "access_token": token,
        "token_type": Settings.TOKEN_TYPE,
        "session_id": session_id,
    }


async def revoke_session(session_id: str | None):
    if session_id:
        await session_collection.delete_one({"session_id": session_id})
