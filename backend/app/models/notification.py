from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, Field

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


class CreateNotificationRequest(BaseModel):
    title: str = Field(..., min_length=3, max_length=120)
    message: str = Field(..., min_length=3, max_length=1000)
    notification_type: NotificationType = NotificationType.INFO
    audience: NotificationAudience = NotificationAudience.ALL
    roles: Optional[List[UserRole]] = []
    usernames: Optional[List[str]] = []
