from typing import List

from pydantic import BaseModel, Field


class SendMailRequest(BaseModel):
    to: str = Field(..., min_length=3, max_length=500)
    subject: str = Field(..., min_length=1, max_length=160)
    body: str = Field(..., min_length=1, max_length=20000)
    suppress_signature: bool = Field(default=False)


class BulkDeleteMailRequest(BaseModel):
    message_ids: List[str] = Field(..., min_length=1)


class StarMailRequest(BaseModel):
    starred: bool = Field(default=True)
