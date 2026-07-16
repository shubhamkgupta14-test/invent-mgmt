from enum import Enum
from typing import Optional

from pydantic import Field
from app.models.base import SecureBaseModel


class ManufacturingStatus(str, Enum):
    READY_TO_SELL = "READY_TO_SELL"


class CreateManufacturingRequest(SecureBaseModel):
    batch_no: str = Field(..., min_length=3, max_length=80, description="Manufacturing batch number")
    sku: str = Field(..., min_length=3, max_length=50, description="Manufactured product SKU")
    quantity: int = Field(..., gt=0, le=1_000_000_000, description="Manufactured quantity")
    unit_cost: float = Field(..., gt=0, le=1_000_000_000_000, description="Cost per item excluding extra charges")
    other_charges: float = Field(default=0, ge=0, le=1_000_000_000_000, description="Other manufacturing charges")
    notes: Optional[str] = Field(default=None, max_length=1000)
