import importlib.util
import unittest
from datetime import UTC, datetime, timedelta

from fastapi import HTTPException

import _setup  # noqa: F401
from fakes import FakeCollection


@unittest.skipIf(importlib.util.find_spec("motor") is None, "motor is not installed")
class AdminAccessServiceTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        from app.services import admin_access_service

        self.service = admin_access_service
        self.original_sessions = self.service.sessions_collection
        self.original_users = self.service.users_collection
        self.service.sessions_collection = FakeCollection()
        self.service.users_collection = FakeCollection()

    async def asyncTearDown(self):
        self.service.sessions_collection = self.original_sessions
        self.service.users_collection = self.original_users

    async def test_non_superadmin_cannot_request_admin_access(self):
        with self.assertRaises(HTTPException) as ctx:
            await self.service.require_superadmin({"role": "admin"})
        self.assertEqual(ctx.exception.status_code, 403)

    async def test_access_status_is_scoped_to_current_session(self):
        now = datetime.now(UTC).replace(tzinfo=None)
        self.service.sessions_collection = FakeCollection([
            {
                "session_id": "current-session",
                "user_id": "user-1",
                "admin_verified_until": now + timedelta(minutes=10),
            },
            {
                "session_id": "other-session",
                "user_id": "user-1",
                "admin_verified_until": now + timedelta(minutes=10),
            },
        ])

        result = await self.service.get_admin_access_status({
            "role": "superadmin",
            "user_id": "user-1",
            "session_id": "current-session",
        })

        self.assertTrue(result["verified"])

    async def test_expired_verification_is_not_accepted(self):
        now = datetime.now(UTC).replace(tzinfo=None)
        self.service.sessions_collection = FakeCollection([{
            "session_id": "session-1",
            "user_id": "user-1",
            "admin_verified_until": now - timedelta(seconds=1),
        }])

        result = await self.service.get_admin_access_status({
            "role": "superadmin",
            "user_id": "user-1",
            "session_id": "session-1",
        })

        self.assertFalse(result["verified"])


if __name__ == "__main__":
    unittest.main()
