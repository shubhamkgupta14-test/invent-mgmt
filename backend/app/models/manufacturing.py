from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class ManufacturingStatus(str, Enum):
    READY_TO_SELL = "READY_TO_SELL"


class CreateManufacturingRequest(BaseModel):
    batch_no: str = Field(..., min_length=3, description="Manufacturing batch number")
    sku: str = Field(..., min_length=3, description="Manufactured product SKU")
    quantity: int = Field(..., gt=0, description="Manufactured quantity")
    unit_cost: float = Field(..., gt=0, description="Cost per item excluding extra charges")
    other_charges: float = Field(default=0, ge=0, description="Other manufacturing charges")
    notes: Optional[str] = None
