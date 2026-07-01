import importlib.util
import unittest
from datetime import UTC, datetime

from fastapi import HTTPException

import _setup  # noqa: F401
from fakes import FakeCollection


@unittest.skipIf(
    importlib.util.find_spec("motor") is None,
    "motor is not installed",
)
class UserPasswordServiceTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        from app.models.auth import UserRole
        from app.utils.helpers import hash_password

        self.UserRole = UserRole
        self.user = {
            "_id": "user-1",
            "username": "admin",
            "email": "admin@example.com",
            "password": hash_password("old-password"),
            "active": True,
            "role": UserRole.ADMIN,
            "created_at": datetime(2026, 1, 1, tzinfo=UTC),
            "updated_at": datetime(2026, 1, 1, tzinfo=UTC),
        }

    async def test_change_password_updates_hash(self):
        from app.services import user_service
        from app.services.auth_service import bcrypt_context

        original_collection = user_service.user_collection
        fake_users = FakeCollection([self.user])
        user_service.user_collection = fake_users

        try:
            result = await user_service.change_password(
                {"username": "admin"},
                "old-password",
                "new-password",
            )
        finally:
            user_service.user_collection = original_collection

        self.assertEqual(result, {"updated": True})
        self.assertTrue(bcrypt_context.verify("new-password", fake_users.docs[0]["password"]))

    async def test_change_password_rejects_wrong_current_password(self):
        from app.services import user_service

        original_collection = user_service.user_collection
        user_service.user_collection = FakeCollection([self.user])

        try:
            with self.assertRaises(HTTPException) as ctx:
                await user_service.change_password(
                    {"username": "admin"},
                    "wrong-password",
                    "new-password",
                )
        finally:
            user_service.user_collection = original_collection

        self.assertEqual(ctx.exception.status_code, 400)


if __name__ == "__main__":
    unittest.main()
