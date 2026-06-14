from pydantic import BaseModel, Field
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


class PurchaseItem(BaseModel):
    sku: str = Field(..., min_length=3,
                     description="Product SKU")
    quantity: int = Field(..., gt=0,
                          description="Quantity of product purchased")
    unit_price: float = Field(..., gt=0, description="Purchase price per unit")
    discount_percentage: float = Field(default=0, ge=0, le=100,
                                       description="Discount percentage applied on item")


class PaymentDetail(BaseModel):
    payment_method: PaymentMethod
    amount_paid: float = Field(..., gt=0,
                               description="Amount paid to supplier")


class CreatePurchaseRequest(BaseModel):
    invoice_id: str = Field(..., min_length=3,
                            description="Purchase invoice number")
    items: List[PurchaseItem]
    additional_discount: float = Field(
        default=0, ge=0, description="Any additional discount on total bill")
    shipping_charges: float = Field(
        default=0, ge=0, description="Shipping charges")
    other_charges: float = Field(
        default=0, ge=0, description="Any Miscellaneous charges")
    payment_details: List[PaymentDetail]
    notes: Optional[str] = None
