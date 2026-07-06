from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class LoyaltyStatus(str, Enum):
    PENDING = "PENDING"
    ELIGIBLE = "ELIGIBLE"
    REDEEMED = "REDEEMED"
    CANCELLED = "CANCELLED"


class LoyaltyOrderStatus(str, Enum):
    QUALIFIED = "QUALIFIED"
    DISQUALIFIED = "DISQUALIFIED"
    REDEEM_ORDER = "REDEEM_ORDER"


class LoyaltyOrderAdd(BaseModel):
    email: Optional[str] = Field(default=None, pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
    ref_no: Optional[str] = Field(default=None, min_length=4, max_length=32)
    order_id: str = Field(..., min_length=1, max_length=100)
    notes: Optional[str] = Field(default=None, max_length=500)


class LoyaltyRedeem(BaseModel):
    order_id: str = Field(..., min_length=1, max_length=100)
    email: Optional[str] = Field(default=None, pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
    ref_no: Optional[str] = Field(default=None, min_length=4, max_length=32)
    notes: Optional[str] = Field(default=None, max_length=500)


class LoyaltyCancel(BaseModel):
    email: Optional[str] = Field(default=None, pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
    ref_no: Optional[str] = Field(default=None, min_length=4, max_length=32)
    reason: str = Field(..., min_length=3, max_length=500)
