from enum import Enum

from pydantic import BaseModel, Field
from typing import Literal, Optional


class StockStatus(str, Enum):
    IN_STOCK = "IN_STOCK"
    LOW_QUANTITY = "LOW_QUANTITY"
    OUT_OF_STOCK = "OUT_OF_STOCK"


class StockResponse(BaseModel):
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


class SellingPriceChargeOverrides(BaseModel):
    marketplace_commission: Optional[float] = Field(default=None, ge=0)
    shipping_charges: Optional[float] = Field(default=None, ge=0)
    platform_fees: Optional[float] = Field(default=None, ge=0)
    packaging_charges: Optional[float] = Field(default=None, ge=0)
    return_rto: Optional[float] = Field(default=None, ge=0)
    margin: Optional[float] = Field(default=None, ge=0)
    misc: Optional[float] = Field(default=None, ge=0)
    advertisement: Optional[float] = Field(default=None, ge=0)
    promotion: Optional[float] = Field(default=None, ge=0)


class SellingPriceCalculationRequest(BaseModel):
    sku: str = Field(..., min_length=2)
    dead_weight: float = Field(default=0, ge=0)
    volumetric_weight: float = Field(default=0, ge=0)
    packing_types: list[Literal["Cardbox", "Pollybag"]] = Field(default_factory=list)
    packing_size: Literal["S", "M", "L"] = "S"
    overrides: SellingPriceChargeOverrides = Field(
        default_factory=SellingPriceChargeOverrides
    )
    save_default: bool = False
