from pydantic import BaseModel, Field
from typing import Optional


class CompanyCustomField(BaseModel):
    label: Optional[str] = Field(default="", max_length=80)
    value: Optional[str] = Field(default="", max_length=300)


class CompanySettingsUpdate(BaseModel):
    company_name: Optional[str] = Field(default="", max_length=120)
    brand_name: Optional[str] = Field(default="", max_length=120)
    email: Optional[str] = Field(default="", max_length=120)
    phone: Optional[str] = Field(default="", max_length=20)
    address: Optional[str] = Field(default="", max_length=500)
    gst_number: Optional[str] = Field(default="", max_length=20)
    website: Optional[str] = Field(default="", max_length=160)
    logo_url: Optional[str] = Field(default="", max_length=300)
    currency: Optional[str] = Field(default="INR", min_length=3, max_length=3)
    custom_fields: list[CompanyCustomField] = Field(default_factory=list)
