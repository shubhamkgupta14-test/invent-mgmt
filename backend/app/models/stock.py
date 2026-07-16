from enum import Enum

from pydantic import Field
from app.models.base import SecureBaseModel
from typing import Literal, Optional


class StockStatus(str, Enum):
    IN_STOCK = "IN_STOCK"
    LOW_QUANTITY = "LOW_QUANTITY"
    OUT_OF_STOCK = "OUT_OF_STOCK"


class StockResponse(SecureBaseModel):
    sku: str
    name: str
    quantity: int = Field(
        default=0,
        ge=0
    )
    avg_price: float = Field(
        default=0,
        ge=0
    )
    inventory_value: float = Field(
        default=0,
        ge=0
    )
    stock_status: StockStatus
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class SellingPriceChargeOverrides(SecureBaseModel):
    marketplace_commission: Optional[float] = Field(default=None, ge=0)
    shipping_charges: Optional[float] = Field(default=None, ge=0)
    platform_fees: Optional[float] = Field(default=None, ge=0)
    packaging_charges: Optional[float] = Field(default=None, ge=0)
    return_rto: Optional[float] = Field(default=None, ge=0)
    margin: Optional[float] = Field(default=None, ge=0)
    misc: Optional[float] = Field(default=None, ge=0)
    advertisement: Optional[float] = Field(default=None, ge=0)
    promotion: Optional[float] = Field(default=None, ge=0)


class SellingPriceChargeSettings(SecureBaseModel):
    marketplace_commission: float = Field(default=0, ge=0)
    shipping_charges: Optional[float] = Field(default=None, ge=0)
    platform_fees_percent: float = Field(default=5, ge=0)
    platform_fees_min: float = Field(default=10, ge=0)
    platform_fees_max: float = Field(default=25, ge=0)
    packaging_charges: Optional[float] = Field(default=None, ge=0)
    return_rto_percent: float = Field(default=10, ge=0)
    margin_percent: float = Field(default=30, ge=0)
    misc_percent: float = Field(default=5, ge=0)
    advertisement_percent: float = Field(default=2, ge=0)
    promotion_percent: float = Field(default=5, ge=0)


class SellingPriceCalculationRequest(SecureBaseModel):
    sku: str = Field(..., min_length=2, max_length=50)
    dead_weight: float = Field(default=0, ge=0)
    volumetric_weight: float = Field(default=0, ge=0)
    packing_types: list[Literal["Cardbox", "Pollybag"]] = Field(default_factory=list, max_length=2)
    packing_size: Literal["S", "M", "L"] = "S"
    overrides: SellingPriceChargeOverrides = Field(
        default_factory=SellingPriceChargeOverrides
    )
    settings: SellingPriceChargeSettings = Field(
        default_factory=SellingPriceChargeSettings
    )
    actual_price: Optional[float] = Field(default=None, ge=0)
    save_default: bool = False


class StockActualPriceUpdate(SecureBaseModel):
    actual_price: float = Field(default=0, ge=0)


class StockBarcodeUpdate(SecureBaseModel):
    barcode: Optional[str] = Field(default=None, max_length=128)
