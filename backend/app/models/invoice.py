from datetime import datetime
from typing import List, Optional

from pydantic import Field
from app.models.base import SecureBaseModel


class InvoiceBuyer(SecureBaseModel):
    name: str = Field(..., min_length=1, max_length=160)
    phone: Optional[str] = Field(default="", max_length=20)
    email: Optional[str] = Field(default="", max_length=120)
    address: Optional[str] = Field(default="", max_length=500)
    gst_number: Optional[str] = Field(default="", max_length=20)
    place_of_supply: Optional[str] = Field(default="", max_length=80)


class InvoiceItemCreate(SecureBaseModel):
    sku: str = Field(..., min_length=1, max_length=50)
    quantity: int = Field(..., gt=0, le=1_000_000_000)
    unit_price: Optional[float] = Field(
        default=None,
        ge=0, le=1_000_000_000_000,
        description="Selling price before GST. Defaults to stock min selling price.",
    )


class InvoiceCreate(SecureBaseModel):
    invoice_id: Optional[str] = Field(default=None, max_length=80)
    invoice_date: Optional[datetime] = None
    buyer: InvoiceBuyer
    items: List[InvoiceItemCreate] = Field(..., min_length=1, max_length=100)
    sold_offline: bool = False
    additional_discount: float = Field(default=0, ge=0, le=1_000_000_000_000)
    payment_method: Optional[str] = Field(default="CASH", max_length=60)
    payment_status: Optional[str] = Field(default="PAID", max_length=40)
    notes: Optional[str] = Field(default="", max_length=500)


class InvoiceCancelRequest(SecureBaseModel):
    reason: str = Field(..., min_length=3, max_length=500)


class InvoiceBulkEmailRequest(SecureBaseModel):
    invoice_record_ids: List[str] = Field(..., min_length=1, max_length=100)
