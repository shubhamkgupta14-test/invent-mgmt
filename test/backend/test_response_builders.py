import unittest
import importlib.util
from datetime import UTC, datetime

import _setup  # noqa: F401

if importlib.util.find_spec("bson") is None:
    raise unittest.SkipTest("pymongo/bson is not installed")

from app.utils.responseBuilder import (
    build_product_response,
    build_supplier_response,
    build_user_response,
)


NOW = datetime(2026, 1, 1, 10, 30, tzinfo=UTC)


class ResponseBuilderTests(unittest.TestCase):
    def test_build_user_response_includes_name_and_email(self):
        response = build_user_response({
            "_id": "u1",
            "username": "admin",
            "firstname": "Asha",
            "lastname": "Rao",
            "email": "asha@example.com",
            "role": "admin",
            "active": True,
            "created_at": NOW,
            "updated_at": NOW,
        })

        self.assertEqual(response["firstname"], "Asha")
        self.assertEqual(response["lastname"], "Rao")
        self.assertEqual(response["email"], "asha@example.com")

    def test_build_product_response_maps_nested_attributes(self):
        response = build_product_response({
            "_id": "p1",
            "sku": "SKU-1",
            "name": "Product",
            "description": "Description",
            "category": "Home",
            "unit_of_measure": "pcs",
            "tax_rate": 5,
            "reorder_level": 2,
            "attributes": {"color": "Blue"},
            "supplier_id": "SUP-0001",
            "is_active": True,
            "created_at": NOW,
            "updated_at": NOW,
        })

        self.assertEqual(response["attributes"]["color"], "Blue")
        self.assertIsNone(response["attributes"]["material"])

    def test_build_supplier_response_defaults_active_true(self):
        response = build_supplier_response({
            "_id": "s1",
            "supplier_id": "SUP-0001",
            "name": "Supplier",
            "created_at": NOW,
            "updated_at": NOW,
        })

        self.assertTrue(response["is_active"])


if __name__ == "__main__":
    unittest.main()
