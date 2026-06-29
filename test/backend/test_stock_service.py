import importlib.util
import unittest

import _setup  # noqa: F401


@unittest.skipIf(importlib.util.find_spec("motor") is None, "motor is not installed")
class StockServiceTests(unittest.TestCase):
    def test_calculate_stock_status_boundaries(self):
        from app.models.stock import StockStatus
        from app.services.stock_service import calculate_stock_status

        self.assertEqual(calculate_stock_status(0), StockStatus.OUT_OF_STOCK)
        self.assertEqual(calculate_stock_status(4), StockStatus.LOW_QUANTITY)
        self.assertEqual(calculate_stock_status(5), StockStatus.IN_STOCK)


if __name__ == "__main__":
    unittest.main()
