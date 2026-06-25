from pydantic import (BaseModel, Field, field_validator)
from typing import Optional
from datetime import datetime


class ProductAttributes(BaseModel):
    color: Optional[str] = None
    material: Optional[str] = None
    weight: Optional[str] = None
    size: Optional[str] = None
    dimension: Optional[str] = None


class ProductBase(BaseModel):
    sku: str = Field(..., min_length=2, max_length=50,
                     description="Unique product SKU code")
    name: str = Field(..., min_length=2, max_length=200,
                      description="Product name")
    description: str = Field(..., min_length=2, max_length=200,
                             description="Product description")
    category: str = Field(default="General", max_length=100,
                          description="Product category")
    unit_of_measure: str = Field(..., max_length=20,
                                 description="Unit of measurement", enum=["pcs", "kg", "g", "m", "cm", "ltr", "ml", "other"])
    tax_rate: float = Field(..., ge=0, le=100,
                            description="Applicable tax percentage")
    reorder_level: int = Field(
        default=5, ge=0, description="Minimum stock alert quantity")
    attributes: Optional[ProductAttributes] = Field(default=None,
                                                    description="Additional product attributes")
    supplier_id: Optional[str] = Field(
        default=None, description="ID of the supplier providing this product")
    is_active: bool = Field(default=True, description="Product active status")
    created_at: datetime = Field(
        default_factory=datetime.utcnow, description="Product creation timestamp")
    updated_at: datetime = Field(
        default_factory=datetime.utcnow, description="Last updated timestamp")

    @field_validator("sku")
    @classmethod
    #  remove trim space then convert internal space to - and uppercase
    def validate_sku(cls, value):
        value = value.strip().upper()
        value = "-".join(value.split())
        if len(value) < 2:
            raise ValueError("SKU too short")
        return value

    @field_validator("name")
    @classmethod
    def validate_name(cls, value):
        value = value.strip()
        if len(value) < 2:
            raise ValueError("Product name too short")
        return value

    @field_validator("category")
    @classmethod
    def validate_category(cls, value):
        value = value.strip()
        if len(value) < 2:
            raise ValueError("Product category too short")
        return value

    @field_validator("description")
    @classmethod
    def validate_description(cls, value):
        value = value.strip()
        if len(value) < 2:
            raise ValueError("Product description too short")
        return value

    @field_validator("unit_of_measure")
    @classmethod
    def validate_unit_of_measure(cls, value):
        return value.strip()


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    description: str = None
    attributes: Optional[ProductAttributes] = None
    unit_of_measure: Optional[str] = Field(max_length=20,
                                           description="Unit of measurement", enum=["pcs", "kg", "g", "m", "cm", "ltr", "ml", "other"])
    tax_rate: Optional[float] = Field(
        ge=0, le=100, description="Applicable tax percentage")
    reorder_level: Optional[int] = Field(
        ge=0, description="Minimum stock alert quantity")
    supplier_id: Optional[str] = None
    is_active: Optional[bool] = None
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class ProductDeleteRequest(BaseModel):
    sku: str = Field(..., min_length=2, max_length=50,
                     description="Unique product SKU code")
    permanent: bool = Field(default=False)


class ProductResponse(ProductBase):
    id: str
    created_at: datetime
    updated_at: datetime
