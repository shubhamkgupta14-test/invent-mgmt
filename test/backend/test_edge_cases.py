import importlib.util
import unittest
from datetime import UTC, datetime

from fastapi import HTTPException

import _setup  # noqa: F401
from fakes import FakeCollection


@unittest.skipIf(
    importlib.util.find_spec("motor") is None or importlib.util.find_spec("bson") is None,
    "backend database dependencies are not installed",
)
class EdgeCaseTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        from app.models.auth import UserRole

        self.UserRole = UserRole
        self.now = datetime(2026, 1, 1, tzinfo=UTC)

    async def test_superadmin_cannot_delete_self(self):
        from app.services import user_service

        original_collection = user_service.user_collection
        user_service.user_collection = FakeCollection([
            {
                "_id": "u1",
                "username": "super",
                "firstname": "Super",
                "lastname": "Admin",
                "email": "super@example.com",
                "role": self.UserRole.SUPERADMIN,
                "active": True,
                "created_at": self.now,
                "updated_at": self.now,
            }
        ])

        try:
            with self.assertRaises(HTTPException) as ctx:
                await user_service.delete_user(
                    {"role": self.UserRole.SUPERADMIN, "username": "super"},
                    "super",
                    permanent=False,
                )
        finally:
            user_service.user_collection = original_collection

        self.assertEqual(ctx.exception.status_code, 400)

    async def test_permanent_delete_requires_inactive_user(self):
        from app.services import user_service

        original_collection = user_service.user_collection
        user_service.user_collection = FakeCollection([
            {
                "_id": "u1",
                "username": "user1",
                "firstname": "User",
                "lastname": "",
                "email": "user@example.com",
                "role": self.UserRole.USER,
                "active": True,
                "created_at": self.now,
                "updated_at": self.now,
            }
        ])

        try:
            with self.assertRaises(HTTPException) as ctx:
                await user_service.delete_user(
                    {"role": self.UserRole.SUPERADMIN, "username": "super"},
                    "user1",
                    permanent=True,
                )
        finally:
            user_service.user_collection = original_collection

        self.assertEqual(ctx.exception.status_code, 400)

    async def test_clean_database_rejects_unknown_collection(self):
        from app.services.user_service import clean_database_collections

        with self.assertRaises(HTTPException) as ctx:
            await clean_database_collections(
                {"role": self.UserRole.SUPERADMIN, "username": "super"},
                ["products", "unknown"],
            )

        self.assertEqual(ctx.exception.status_code, 400)

    async def test_stock_rejects_invalid_sort_field(self):
        from app.services.stock_service import get_stocks

        with self.assertRaises(HTTPException) as ctx:
            await get_stocks(
                {"role": self.UserRole.SUPERADMIN},
                sort_by="not_allowed",
            )

        self.assertEqual(ctx.exception.status_code, 400)

    async def test_stock_rejects_invalid_status(self):
        from app.services.stock_service import get_stocks

        with self.assertRaises(HTTPException) as ctx:
            await get_stocks(
                {"role": self.UserRole.SUPERADMIN},
                stock_status="BROKEN",
            )

        self.assertEqual(ctx.exception.status_code, 400)

    async def test_filter_products_returns_empty_when_non_superadmin_requests_inactive(self):
        from app.services.product_service import filter_products_service

        result = await filter_products_service(
            is_active=False,
            auth_user={"role": self.UserRole.ADMIN},
        )

        self.assertEqual(result, [])


if __name__ == "__main__":
    unittest.main()
