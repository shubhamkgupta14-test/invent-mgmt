import importlib.util
import unittest
from datetime import UTC, datetime

import _setup  # noqa: F401
from fakes import FakeCollection


@unittest.skipIf(importlib.util.find_spec("motor") is None, "motor is not installed")
class UserServiceTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        from app.models.auth import UserRole
        from app.services import user_service

        self.UserRole = UserRole
        self.user_service = user_service
        self.now = datetime(2026, 1, 1, tzinfo=UTC)
        self.collection = FakeCollection([
            {
                "_id": "u1",
                "username": "super",
                "firstname": "Super",
                "lastname": "Admin",
                "email": "super@example.com",
                "role": UserRole.SUPERADMIN,
                "active": True,
                "created_at": self.now,
                "updated_at": self.now,
            },
            {
                "_id": "u2",
                "username": "user1",
                "firstname": "Plain",
                "lastname": "",
                "email": "user@example.com",
                "role": UserRole.USER,
                "active": False,
                "created_at": self.now,
                "updated_at": self.now,
            },
        ])
        self.original_collection = user_service.user_collection
        user_service.user_collection = self.collection

    async def asyncTearDown(self):
        self.user_service.user_collection = self.original_collection

    async def test_activate_user_sets_active_true(self):
        result = await self.user_service.activate_user(
            {"role": self.UserRole.SUPERADMIN, "username": "super"},
            "user1",
        )

        self.assertTrue(result["active"])

    async def test_delete_user_soft_deactivates_active_user(self):
        self.collection.docs[1]["active"] = True

        result = await self.user_service.delete_user(
            {"role": self.UserRole.SUPERADMIN, "username": "super"},
            "user1",
            permanent=False,
        )

        self.assertEqual(result, "User deleted successfully")
        self.assertFalse(self.collection.docs[1]["active"])

    async def test_update_user_role_changes_role(self):
        self.collection.docs[1]["active"] = True

        result = await self.user_service.update_user_role(
            {"role": self.UserRole.SUPERADMIN, "username": "super"},
            "user1",
            self.UserRole.ADMIN,
        )

        self.assertEqual(result["role"], self.UserRole.ADMIN)

    async def test_clean_database_preserves_current_superadmin_user(self):
        users = FakeCollection(self.collection.docs)
        products = FakeCollection([{"_id": "p1"}])
        original_map = self.user_service.SUPERADMIN_CLEANABLE_COLLECTIONS
        self.user_service.SUPERADMIN_CLEANABLE_COLLECTIONS = {
            "users": users,
            "products": products,
        }

        try:
            result = await self.user_service.clean_database_collections(
                {"role": self.UserRole.SUPERADMIN, "username": "super"},
                ["users", "products"],
            )
        finally:
            self.user_service.SUPERADMIN_CLEANABLE_COLLECTIONS = original_map

        self.assertEqual(result["users"], 1)
        self.assertEqual(result["products"], 1)
        self.assertEqual(users.docs[0]["username"], "super")


if __name__ == "__main__":
    unittest.main()
