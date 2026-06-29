import unittest
import importlib.util
from datetime import UTC, datetime

import _setup  # noqa: F401

if importlib.util.find_spec("bson") is None:
    raise unittest.SkipTest("pymongo/bson is not installed")

from app.utils.helpers import (
    format_datetime_ist,
    normalize_product_name,
    normalize_sku,
    normalize_username,
    round_final_amount,
    round_price,
)


class HelperTests(unittest.TestCase):
    def test_normalize_sku_uppercases_and_joins_spaces(self):
        self.assertEqual(normalize_sku("  ab 12  "), "AB-12")

    def test_normalize_product_name_title_cases_and_collapses_spaces(self):
        self.assertEqual(normalize_product_name("  cotton   pillow cover "), "Cotton Pillow Cover")

    def test_normalize_username_lowercases_and_trims(self):
        self.assertEqual(normalize_username("  AdminUser  "), "adminuser")

    def test_rounding_helpers(self):
        self.assertEqual(round_price(12.345), 12.35)
        self.assertEqual(round_final_amount(99.995), 100.0)

    def test_format_datetime_ist_converts_utc(self):
        value = format_datetime_ist(datetime(2026, 1, 1, 0, 0, 0, tzinfo=UTC))
        self.assertEqual(value, "2026-01-01T05:30:00 IST")


if __name__ == "__main__":
    unittest.main()
