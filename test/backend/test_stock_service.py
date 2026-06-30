import importlib.util
import unittest
from datetime import UTC, datetime

from fastapi import HTTPException

import _setup  # noqa: F401
from fakes import FakeCollection


@unittest.skipIf(importlib.util.find_spec("motor") is None, "motor is not installed")
class StockServiceTests(unittest.TestCase):
    def test_calculate_stock_status_boundaries(self):
        from app.models.stock import StockStatus
        from app.services.stock_service import calculate_stock_status

        self.assertEqual(calculate_stock_status(0), StockStatus.OUT_OF_STOCK)
        self.assertEqual(calculate_stock_status(4), StockStatus.LOW_QUANTITY)
        self.assertEqual(calculate_stock_status(5), StockStatus.IN_STOCK)


@unittest.skipIf(importlib.util.find_spec("motor") is None, "motor is not installed")
class SellingPriceCalculatorTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        from app.models.auth import UserRole

        self.UserRole = UserRole
        self.now = datetime(2026, 1, 1, tzinfo=UTC)

    async def test_calculate_selling_price_saves_default_not_custom(self):
        from app.services import stock_service

        original_stocks = stock_service.stocks_collection
        original_products = stock_service.products_collection
        stock_service.stocks_collection = FakeCollection([
            {
                "_id": "stock-1",
                "sku": "SKU-1",
                "name": "Bedsheet",
                "quantity": 10,
                "avg_price": 100,
                "inventory_value": 1000,
                "stock_status": "IN_STOCK",
                "created_at": self.now,
                "updated_at": self.now,
            }
        ])
        stock_service.products_collection = FakeCollection([
            {"sku": "SKU-1", "tax_rate": 18}
        ])

        try:
            result = await stock_service.calculate_selling_price(
                {"role": self.UserRole.ADMIN},
                {
                    "sku": "SKU-1",
                    "dead_weight": 600,
                    "volumetric_weight": 400,
                    "packing_types": ["Cardbox", "Pollybag"],
                    "packing_size": "M",
                    "overrides": {
                        "marketplace_commission": 9,
                        "shipping_charges": 80,
                    },
                    "save_default": True,
                },
            )
            stored = await stock_service.stocks_collection.find_one({"sku": "SKU-1"})
        finally:
            stock_service.stocks_collection = original_stocks
            stock_service.products_collection = original_products

        self.assertEqual(result["chargeable_weight"], 600)
        self.assertEqual(result["charges"]["shipping_charges"]["default"], 70)
        self.assertEqual(result["charges"]["packaging_charges"]["default"], 15)
        self.assertEqual(result["default_selling_price"], 265)
        self.assertEqual(result["custom_selling_price"], 284)
        self.assertEqual(stored["min_selling_price"], 265)
        self.assertEqual(
            stored["selling_price_calculation"]["default_selling_price"],
            265,
        )

    async def test_calculate_selling_price_uses_35_shipping_under_500g(self):
        from app.services import stock_service

        original_stocks = stock_service.stocks_collection
        original_products = stock_service.products_collection
        stock_service.stocks_collection = FakeCollection([
            {
                "_id": "stock-1",
                "sku": "SKU-1",
                "name": "Bedsheet",
                "quantity": 10,
                "avg_price": 100,
                "inventory_value": 1000,
                "stock_status": "IN_STOCK",
                "created_at": self.now,
                "updated_at": self.now,
            }
        ])
        stock_service.products_collection = FakeCollection([
            {"sku": "SKU-1", "tax_rate": 18}
        ])

        try:
            result = await stock_service.calculate_selling_price(
                {"role": self.UserRole.ADMIN},
                {
                    "sku": "SKU-1",
                    "dead_weight": 500,
                    "volumetric_weight": 200,
                    "packing_types": [],
                    "packing_size": "S",
                    "overrides": {},
                },
            )
        finally:
            stock_service.stocks_collection = original_stocks
            stock_service.products_collection = original_products

        self.assertEqual(result["chargeable_weight"], 500)
        self.assertEqual(result["charges"]["shipping_charges"]["default"], 35)
        self.assertEqual(result["default_selling_price"], 215)
        self.assertEqual(result["custom_selling_price"], 215)

    async def test_user_role_cannot_calculate_selling_price(self):
        from app.services.stock_service import calculate_selling_price

        with self.assertRaises(HTTPException) as ctx:
            await calculate_selling_price(
                {"role": self.UserRole.USER},
                {"sku": "SKU-1"},
            )

        self.assertEqual(ctx.exception.status_code, 403)


if __name__ == "__main__":
    unittest.main()
