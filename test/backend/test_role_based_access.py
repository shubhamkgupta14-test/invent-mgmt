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
class RoleBasedAccessTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        from app.models.auth import UserRole

        self.UserRole = UserRole
        self.now = datetime(2026, 1, 1, tzinfo=UTC)

    async def test_user_role_cannot_create_product(self):
        from app.services.product_service import add_product

        with self.assertRaises(HTTPException) as ctx:
            await add_product(
                {
                    "sku": "SKU-1",
                    "name": "Test Product",
                    "description": "Valid description",
                    "category": "Home",
                    "unit_of_measure": "pcs",
                    "tax_rate": 5,
                    "reorder_level": 2,
                    "attributes": {},
                },
                {"role": self.UserRole.USER},
            )

        self.assertEqual(ctx.exception.status_code, 403)

    async def test_user_role_cannot_create_supplier(self):
        from app.services.supplier_service import add_supplier

        with self.assertRaises(HTTPException) as ctx:
            await add_supplier(
                {"name": "Supplier", "contact_person": "Person"},
                {"role": self.UserRole.USER},
            )

        self.assertEqual(ctx.exception.status_code, 403)

    async def test_admin_cannot_read_inactive_product_details(self):
        from app.services import product_service

        original_collection = product_service.products_collection
        product_service.products_collection = FakeCollection([
            {
                "_id": "p1",
                "sku": "SKU-1",
                "name": "Product",
                "description": "Description",
                "category": "Home",
                "unit_of_measure": "pcs",
                "tax_rate": 5,
                "reorder_level": 2,
                "attributes": {},
                "supplier_id": "SUP-0001",
                "is_active": False,
                "created_at": self.now,
                "updated_at": self.now,
            }
        ])

        try:
            with self.assertRaises(HTTPException) as ctx:
                await product_service.get_product_by_sku(
                    "SKU-1",
                    {"role": self.UserRole.ADMIN},
                )
        finally:
            product_service.products_collection = original_collection

        self.assertEqual(ctx.exception.status_code, 403)

    async def test_admin_cannot_read_inactive_supplier_details(self):
        from app.services import supplier_service

        original_collection = supplier_service.suppliers_collection
        supplier_service.suppliers_collection = FakeCollection([
            {
                "_id": "s1",
                "supplier_id": "SUP-0001",
                "name": "Supplier",
                "contact_person": "Person",
                "is_active": False,
                "created_at": self.now,
                "updated_at": self.now,
            }
        ])

        try:
            with self.assertRaises(HTTPException) as ctx:
                await supplier_service.get_supplier_by_id(
                    "SUP-0001",
                    {"role": self.UserRole.ADMIN},
                )
        finally:
            supplier_service.suppliers_collection = original_collection

        self.assertEqual(ctx.exception.status_code, 403)

    async def test_admin_cannot_fetch_audit_logs(self):
        from app.services.audit_service import get_audit_logs

        with self.assertRaises(HTTPException) as ctx:
            await get_audit_logs({"role": self.UserRole.ADMIN})

        self.assertEqual(ctx.exception.status_code, 403)

    async def test_superadmin_can_read_inactive_product_details(self):
        from app.services import product_service

        original_collection = product_service.products_collection
        product_service.products_collection = FakeCollection([
            {
                "_id": "p1",
                "sku": "SKU-1",
                "name": "Product",
                "description": "Description",
                "category": "Home",
                "unit_of_measure": "pcs",
                "tax_rate": 5,
                "reorder_level": 2,
                "attributes": {},
                "supplier_id": "SUP-0001",
                "is_active": False,
                "created_at": self.now,
                "updated_at": self.now,
            }
        ])

        try:
            result = await product_service.get_product_by_sku(
                "SKU-1",
                {"role": self.UserRole.SUPERADMIN},
            )
        finally:
            product_service.products_collection = original_collection

        self.assertFalse(result["is_active"])


if __name__ == "__main__":
    unittest.main()
