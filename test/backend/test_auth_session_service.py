import importlib.util
import unittest
from datetime import timedelta
from types import SimpleNamespace

import jwt
from bson import ObjectId
from fastapi import HTTPException

import _setup  # noqa: F401
from fakes import FakeCollection


@unittest.skipIf(importlib.util.find_spec("motor") is None, "motor is not installed")
class AuthSessionServiceTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        from app.services import auth_service

        self.service = auth_service
        self.user_id = ObjectId()
        self.users = FakeCollection([{
            "_id": self.user_id,
            "username": "admin",
            "role": "admin",
            "active": True,
            "token_version": 0,
        }])
        self.sessions = FakeCollection([])
        self.original_users = auth_service.user_collection
        self.original_sessions = auth_service.session_collection
        auth_service.user_collection = self.users
        auth_service.session_collection = self.sessions

    async def asyncTearDown(self):
        self.service.user_collection = self.original_users
        self.service.session_collection = self.original_sessions

    def request_for(self, token):
        return SimpleNamespace(
            cookies={self.service.Settings.AUTH_COOKIE_NAME: token},
            method="GET",
            headers={},
        )

    async def test_active_session_is_accepted_and_touched(self):
        session_id = await self.service.create_session({"_id": self.user_id})
        token = self.service.create_access_token(
            self.user_id, "admin", "admin", session_id, 0,
        )
        before = self.sessions.docs[0]["last_activity_at"]

        result = await self.service.get_current_user(self.request_for(token))

        self.assertEqual(result["session_id"], session_id)
        self.assertGreaterEqual(self.sessions.docs[0]["last_activity_at"], before)

    async def test_idle_session_is_revoked(self):
        session_id = await self.service.create_session({"_id": self.user_id})
        self.sessions.docs[0]["last_activity_at"] = (
            self.service._now_naive()
            - timedelta(minutes=self.service.Settings.SESSION_IDLE_TIMEOUT_MINUTES + 1)
        )
        token = self.service.create_access_token(
            self.user_id, "admin", "admin", session_id, 0,
        )

        with self.assertRaises(HTTPException):
            await self.service.get_current_user(self.request_for(token))

        self.assertEqual(self.sessions.docs, [])

    async def test_token_contains_session_and_eight_hour_expiry(self):
        session_id = "session-1"
        token = self.service.create_access_token(
            self.user_id, "admin", "admin", session_id, 0,
        )
        payload = jwt.decode(
            token,
            self.service.SECRET_KEY,
            algorithms=[self.service.ALGORITHM],
        )

        self.assertEqual(payload["sid"], session_id)
        self.assertEqual(payload["exp"] - payload["iat"], 8 * 60 * 60)


if __name__ == "__main__":
    unittest.main()
