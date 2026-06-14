from enum import Enum

from pydantic import BaseModel, Field
from typing import Optional


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
