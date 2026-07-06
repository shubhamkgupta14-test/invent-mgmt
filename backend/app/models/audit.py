from enum import Enum
from typing import Optional, Any

from pydantic import BaseModel, Field

from datetime import datetime, UTC


class AuditModule(str, Enum):
    STOCK = "STOCK"
    PURCHASE = "PURCHASE"
    SALES = "SALES"
    INVOICE = "INVOICE"
    RETURN = "RETURN"
    EXCHANGE = "EXCHANGE"
    MANUFACTURING = "MANUFACTURING"
    LOYALTY = "LOYALTY"


class AuditEvent(str, Enum):
    CREATED = "CREATED"
    UPDATED = "UPDATED"
    DELETED = "DELETED"

    STOCK_INCREASED = "STOCK_INCREASED"
    STOCK_DECREASED = "STOCK_DECREASED"
    STOCK_ADJUSTED = "STOCK_ADJUSTED"


class AuditCreate(BaseModel):
    module_name: AuditModule
    event_type: AuditEvent
    reference_id: Optional[str] = None
    sku: Optional[str] = None
    old_data: Optional[dict[str, Any]] = None
    new_data: Optional[dict[str, Any]] = None
    performed_by: str
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(UTC)
    )
