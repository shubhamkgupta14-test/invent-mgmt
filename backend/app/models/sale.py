from pydantic import Field
from app.models.base import SecureBaseModel
from typing import List, Optional

from enum import Enum


class SaleStatus(str, Enum):
    SOLD = "SOLD"
    EXCHANGE = "EXCHANGE"
    RETURN = "RETURN"


class SalePlatform(str, Enum):
    FLIPKART = "Flipkart"
    AMAZON = "Amazon"
    MEESHO = "Meesho"
    SELF_STORE = "Self Store"
    OTHER = "Other"


class SaleItem(SecureBaseModel):
    sku: str = Field(..., min_length=2, max_length=50, description="Product SKU")
    quantity: int = Field(..., gt=0, le=1_000_000_000)
    unit_price: float = Field(..., gt=0, le=1_000_000_000_000)
    discount_percentage: float = Field(default=0, ge=0, le=100,
                                       description="Discount percentage applied on item")


class UserInfo(SecureBaseModel):
    user_id: Optional[str] = Field(default=None, max_length=80)
    name: Optional[str] = Field(default=None, max_length=160)
    phone: Optional[str] = Field(default=None, max_length=20)
    email: Optional[str] = Field(default=None, max_length=120)


class PaymentDetail(SecureBaseModel):
    payment_method: str = Field(..., max_length=60)
    amount_paid: float = Field(..., ge=0, le=1_000_000_000_000)
    payment_status: str = Field(..., max_length=40)


class SaleCreate(SecureBaseModel):
    invoice_id: str = Field(..., min_length=1, max_length=80, description="Sale invoice id")
    platform: SalePlatform = SalePlatform.SELF_STORE
    user_info: Optional[UserInfo] = None
    items: List[SaleItem] = Field(..., min_length=1, max_length=100)
    # subtotal: Optional[float] = None
    # total_tax: Optional[float] = None
    # total_discount: Optional[float] = None
    # final_total_amount: Optional[float] = None
    payment_details: Optional[List[PaymentDetail]] = Field(default_factory=list, max_length=20)
    sale_status: SaleStatus = SaleStatus.SOLD
    notes: Optional[str] = Field(default=None, max_length=1000)
