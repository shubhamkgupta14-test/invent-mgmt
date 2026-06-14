from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
import enum

class UserRole(str, enum.Enum):
    USER = "user"
    ADMIN = "admin"
    SUPERADMIN = "superadmin"


class Users(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=5)
    active: bool = Field(default=True)
    role: Optional[UserRole] = Field(default=UserRole.USER)
    created_at: datetime = Field(
        default_factory=datetime.utcnow, description="Product creation timestamp")
    updated_at: datetime = Field(
        default_factory=datetime.utcnow, description="Last updated timestamp")


class CreateUserRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=5)
    # active: bool = Field(default=True)
    # role: Optional[UserRole] = Field(default=UserRole.USER)


class GetUserRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    
class DeleteUserRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    permanent: bool = Field(default=False)


class LoginRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=5)


class UserResponse(Users):
    id: str
    created_at: datetime
    updated_at: datetime


class Token(BaseModel):
    access_token: str
    token_type: str
