from pydantic import Field
from app.models.base import SecureBaseModel
from typing import List, Optional
from enum import Enum


class ReturnedItemStatus(str, Enum):
    RESELLABLE = "RESELLABLE"
    DAMAGED = "DAMAGED"
    LOST = "LOST"


class TransactionItem(SecureBaseModel):
    sku: str = Field(..., min_length=2, max_length=50, description="Product SKU")
    quantity: int = Field(..., gt=0, le=1_000_000_000)
    unit_price: Optional[float] = Field(default=None, ge=0, le=1_000_000_000_000)
    item_status: ReturnedItemStatus = ReturnedItemStatus.RESELLABLE
    reason: Optional[str] = Field(default=None, max_length=500)


class ReturnCreate(SecureBaseModel):
    return_id: str = Field(..., min_length=3, max_length=80)
    sale_id: Optional[str] = Field(default=None, max_length=80)
    invoice_id: Optional[str] = Field(default=None, max_length=80)
    items: List[TransactionItem] = Field(..., min_length=1, max_length=100)
    refund_amount: float = Field(default=0, ge=0, le=1_000_000_000_000)
    notes: Optional[str] = Field(default=None, max_length=1000)


class ExchangeCreate(SecureBaseModel):
    exchange_id: str = Field(..., min_length=3, max_length=80)
    sale_id: Optional[str] = Field(default=None, max_length=80)
    invoice_id: Optional[str] = Field(default=None, max_length=80)
    returned_items: List[TransactionItem] = Field(..., min_length=1, max_length=100)
    replacement_items: List[TransactionItem] = Field(..., min_length=1, max_length=100)
    adjustment_amount: float = Field(default=0, ge=0, le=1_000_000_000_000)
    notes: Optional[str] = Field(default=None, max_length=1000)
