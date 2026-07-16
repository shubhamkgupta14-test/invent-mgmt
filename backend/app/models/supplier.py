from pydantic import Field
from app.models.base import SecureBaseModel
from typing import Optional
from datetime import datetime


class SupplierBase(SecureBaseModel):
    name: str = Field(..., min_length=2, max_length=200,
                      description="Supplier name")
    email: Optional[str] = Field(default=None, max_length=200,
                                 description="Supplier Email")
    phone: Optional[str] = Field(default=None, max_length=10,
                                 description="Supplier Phone")
    address: Optional[str] = Field(default=None, max_length=200,
                                   description="Supplier Address")
    gst_number: Optional[str] = Field(default=None, max_length=15,
                                      description="Supplier GST")
    contact_person: str = Field(..., min_length=2, max_length=200,
                                description="Supplier contact person")
    is_active: bool = Field(default=True, description="Supplier active status")
    created_at: datetime = Field(
        default_factory=datetime.utcnow, description="Supplier creation timestamp")
    updated_at: Optional[datetime] = Field(
        default_factory=datetime.utcnow, description="Last updated timestamp")


class SupplierCreate(SupplierBase):
    pass


class SupplierUpdate(SecureBaseModel):
    name: Optional[str] = Field(default=None, min_length=2, max_length=200)
    email: Optional[str] = Field(default=None, max_length=200)
    phone: Optional[str] = Field(default=None, max_length=10)
    address: Optional[str] = Field(default=None, max_length=200)
    gst_number: Optional[str] = Field(default=None, max_length=15)
    contact_person: Optional[str] = Field(default=None, min_length=2, max_length=200)
    is_active: Optional[bool] = None
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class SupplierResponse(SupplierBase):
    id: str
    supplier_id: str
