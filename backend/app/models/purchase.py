from pydantic import Field
from app.models.base import SecureBaseModel
from typing import List, Optional
from enum import Enum


class PaymentMethod(str, Enum):
    CASH = "CASH"
    UPI = "UPI"
    CARD = "CARD"
    BANK_TRANSFER = "BANK_TRANSFER"
    CREDIT = "CREDIT"


class PaymentStatus(str, Enum):
    UNPAID = "UNPAID"
    PARTIAL = "PARTIAL"
    PAID = "PAID"


class PurchaseStatus(str, Enum):
    PENDING = "PENDING"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class PurchaseItem(SecureBaseModel):
    sku: str = Field(..., min_length=3, max_length=50,
                     description="Product SKU")
    barcode: Optional[str] = Field(default=None, max_length=128)
    quantity: int = Field(..., gt=0, le=1_000_000_000,
                          description="Quantity of product purchased")
    unit_price: float = Field(..., gt=0, le=1_000_000_000_000, description="Purchase price per unit")
    actual_price: Optional[float] = Field(default=None, ge=0,
                                          description="Optional MRP / actual price for stock")
    discount_percentage: float = Field(default=0, ge=0, le=100,
                                       description="Discount percentage applied on item")


class PaymentDetail(SecureBaseModel):
    payment_method: PaymentMethod
    amount_paid: float = Field(..., gt=0, le=1_000_000_000_000,
                               description="Amount paid to supplier")


class CreatePurchaseRequest(SecureBaseModel):
    invoice_id: str = Field(..., min_length=3, max_length=80,
                            description="Purchase invoice number")
    items: List[PurchaseItem] = Field(..., min_length=1, max_length=100)
    additional_discount: float = Field(
        default=0, ge=0, description="Flat additional discount on total bill")
    shipping_charges: float = Field(
        default=0, ge=0, description="Shipping charges")
    other_charges: float = Field(
        default=0, ge=0, description="Any Miscellaneous charges")
    payment_details: List[PaymentDetail] = Field(..., min_length=1, max_length=20)
    notes: Optional[str] = Field(default=None, max_length=1000)
