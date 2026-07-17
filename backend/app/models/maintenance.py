from datetime import datetime
from typing import Optional

from pydantic import Field

from app.models.base import SecureBaseModel


class MaintenanceConfigRequest(SecureBaseModel):
    enabled: bool = False
    message: str = Field(
        default="We are performing scheduled maintenance. Please try again shortly.",
        min_length=1,
        max_length=500,
    )
    starts_at: Optional[datetime] = None
    ends_at: Optional[datetime] = None

