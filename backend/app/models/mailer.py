from typing import List

from pydantic import Field
from app.models.base import SecureBaseModel


class SendMailRequest(SecureBaseModel):
    to: str = Field(..., min_length=3, max_length=500)
    subject: str = Field(..., min_length=1, max_length=160)
    body: str = Field(..., min_length=1, max_length=20000)
    suppress_signature: bool = Field(default=False)


class BulkDeleteMailRequest(SecureBaseModel):
    message_ids: List[str] = Field(..., min_length=1, max_length=100)


class StarMailRequest(SecureBaseModel):
    starred: bool = Field(default=True)
