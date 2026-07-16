from enum import Enum
from typing import List, Optional

from pydantic import Field
from app.models.base import SecureBaseModel

from app.models.auth import UserRole


class NotificationType(str, Enum):
    INFO = "INFO"
    WARNING = "WARNING"
    MAINTENANCE = "MAINTENANCE"
    ACTION_REQUIRED = "ACTION_REQUIRED"
    OUT_OF_STOCK = "OUT_OF_STOCK"


class NotificationAudience(str, Enum):
    ALL = "ALL"
    ROLE = "ROLE"
    USERS = "USERS"


class CreateNotificationRequest(SecureBaseModel):
    title: str = Field(..., min_length=3, max_length=120)
    message: str = Field(..., min_length=3, max_length=1000)
    notification_type: NotificationType = NotificationType.INFO
    audience: NotificationAudience = NotificationAudience.ALL
    roles: Optional[List[UserRole]] = Field(default_factory=list, max_length=3)
    usernames: Optional[List[str]] = Field(default_factory=list, max_length=100)
