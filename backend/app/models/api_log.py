from datetime import datetime
from typing import Any, Optional

from app.models.base import SecureBaseModel


class ApiLogResponse(SecureBaseModel):
    trace_id: str
    method: str
    path: str
    query_params: dict[str, Any] = {}
    status_code: Optional[int] = None
    duration_ms: Optional[float] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    request_headers: dict[str, Any] = {}
    request_body: Any = None
    response_body: Any = None
    error_message: Optional[str] = None
    user: Optional[str] = None
    role: Optional[str] = None
    created_at: datetime
