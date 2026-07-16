import unittest
import importlib.util

from pydantic import ValidationError

import _setup  # noqa: F401

if importlib.util.find_spec("bson") is None:
    raise unittest.SkipTest("pymongo/bson is not installed")

from app.models.auth import CreateUserRequest, UserRole
from app.models.product import ProductCreate, ProductUpdate
from app.models.purchase import CreatePurchaseRequest
from app.models.sale import SaleCreate
from app.models.supplier import SupplierCreate


class ModelValidationTests(unittest.TestCase):
    def test_product_create_normalizes_sku_and_name(self):
        product = ProductCreate(
            sku=" ab 12 ",
            name="  cotton bedsheet ",
            description="Soft cotton bedsheet",
            category="Home",
            unit_of_measure="pcs",
            tax_rate=5,
            reorder_level=3,
            supplier_id="SUP-0001",
        )

        self.assertEqual(product.sku, "AB-12")
        self.assertEqual(product.name, "Cotton Bedsheet")

    def test_product_rejects_invalid_tax_rate(self):
        with self.assertRaises(ValidationError):
            ProductCreate(
                sku="AB12",
                name="Product",
                description="Valid description",
                category="Home",
                unit_of_measure="pcs",
                tax_rate=101,
                supplier_id="SUP-0001",
            )

    def test_product_update_accepts_only_is_active(self):
        update = ProductUpdate(is_active=False)

        self.assertFalse(update.is_active)
        self.assertIsNone(update.unit_of_measure)
        self.assertIsNone(update.tax_rate)
        self.assertIsNone(update.reorder_level)

    def test_supplier_optional_contact_fields_allow_empty_values(self):
        supplier = SupplierCreate(
            name="Acme Supplies",
            email=None,
            phone=None,
            gst_number=None,
            contact_person="Rahul",
        )

        self.assertIsNone(supplier.email)
        self.assertIsNone(supplier.phone)
        self.assertIsNone(supplier.gst_number)

    def test_supplier_enforces_phone_and_gst_max_lengths(self):
        with self.assertRaises(ValidationError):
            SupplierCreate(
                name="Acme Supplies",
                phone="12345678901",
                gst_number="1234567890123456",
                contact_person="Rahul",
            )

    def test_create_user_allows_optional_lastname(self):
        user = CreateUserRequest(
            username="admin1",
            password="Secret1!",
            firstname="Admin",
            email="admin@example.com",
            role=UserRole.ADMIN,
        )

        self.assertEqual(user.lastname, "")

    def test_purchase_requires_positive_payment_amount(self):
        with self.assertRaises(ValidationError):
            CreatePurchaseRequest(
                invoice_id="INV-001",
                items=[{"sku": "SKU-1", "quantity": 1, "unit_price": 10}],
                payment_details=[{"payment_method": "CASH", "amount_paid": 0}],
            )

    def test_sale_accepts_optional_customer_info(self):
        sale = SaleCreate(
            invoice_id="SALE-001",
            items=[{"sku": "SKU-1", "quantity": 1, "unit_price": 10}],
            payment_details=[],
        )

        self.assertIsNone(sale.user_info)
        self.assertEqual(sale.platform, "Self Store")
        self.assertEqual(sale.sale_status, "SOLD")


if __name__ == "__main__":
    unittest.main()
