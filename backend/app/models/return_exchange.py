from pydantic import BaseModel, Field
from typing import List, Optional
from enum import Enum


class ReturnedItemStatus(str, Enum):
    RESELLABLE = "RESELLABLE"
    DAMAGED = "DAMAGED"
    LOST = "LOST"


class TransactionItem(BaseModel):
    sku: str = Field(..., min_length=2, description="Product SKU")
    quantity: int = Field(..., gt=0)
    unit_price: Optional[float] = Field(default=None, ge=0)
    item_status: ReturnedItemStatus = ReturnedItemStatus.RESELLABLE
    reason: Optional[str] = None


class ReturnCreate(BaseModel):
    sale_id: Optional[str] = None
    invoice_id: Optional[str] = None
    items: List[TransactionItem]
    refund_amount: float = Field(default=0, ge=0)
    notes: Optional[str] = None


class ExchangeCreate(BaseModel):
    sale_id: Optional[str] = None
    invoice_id: Optional[str] = None
    returned_items: List[TransactionItem]
    replacement_items: List[TransactionItem]
    adjustment_amount: float = Field(default=0, ge=0)
    notes: Optional[str] = None
