import ast
import unittest
from pathlib import Path

import _setup

from app.config.collections import (
    CLEANABLE_COLLECTIONS,
    DEFAULT_CLEANABLE_COLLECTIONS,
)


class ProjectConfigurationTests(unittest.TestCase):
    def test_server_startup_does_not_seed_initial_data(self):
        main_path = _setup.BACKEND / "main.py"
        tree = ast.parse(main_path.read_text(encoding="utf-8"))
        called_functions = {
            node.func.id
            for node in ast.walk(tree)
            if isinstance(node, ast.Call) and isinstance(node.func, ast.Name)
        }

        self.assertNotIn("create_default_superadmin", called_functions)

    def test_cleanup_catalog_contains_every_application_collection(self):
        expected_physical_collections = {
            "api_logs",
            "app_config",
            "auth_sessions",
            "audits",
            "company_settings",
            "exchanges",
            "invoice_counters",
            "invoices",
            "loyalty",
            "mail_messages",
            "manufacturing",
            "notification_reads",
            "notifications",
            "password_otps",
            "products",
            "purchases",
            "returns",
            "sales",
            "stocks",
            "suppliers",
            "users",
        }

        self.assertEqual(set(CLEANABLE_COLLECTIONS.values()), expected_physical_collections)

    def test_default_cleanup_is_limited_and_excludes_master_data(self):
        self.assertLess(len(DEFAULT_CLEANABLE_COLLECTIONS), len(CLEANABLE_COLLECTIONS))
        self.assertTrue(set(DEFAULT_CLEANABLE_COLLECTIONS) <= set(CLEANABLE_COLLECTIONS))
        self.assertTrue(
            {"users", "products", "suppliers", "company-settings"}.isdisjoint(
                DEFAULT_CLEANABLE_COLLECTIONS
            )
        )


if __name__ == "__main__":
    unittest.main()
