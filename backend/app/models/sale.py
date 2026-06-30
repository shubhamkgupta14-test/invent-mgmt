from pydantic import BaseModel, Field
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


class SaleItem(BaseModel):
    sku: str = Field(..., description="Product SKU")
    quantity: int = Field(..., gt=0)
    unit_price: float = Field(..., gt=0)
    discount_percentage: float = Field(default=0, ge=0, le=100,
                                       description="Discount percentage applied on item")


class UserInfo(BaseModel):
    user_id: Optional[str] = None
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None


class PaymentDetail(BaseModel):
    payment_method: str
    amount_paid: float
    payment_status: str


class SaleCreate(BaseModel):
    invoice_id: str = Field(..., description="Sale invoice id")
    platform: SalePlatform = SalePlatform.SELF_STORE
    user_info: Optional[UserInfo] = None
    items: List[SaleItem]
    # subtotal: Optional[float] = None
    # total_tax: Optional[float] = None
    # total_discount: Optional[float] = None
    # final_total_amount: Optional[float] = None
    payment_details: Optional[List[PaymentDetail]] = []
    sale_status: SaleStatus = SaleStatus.SOLD
    notes: Optional[str] = None
