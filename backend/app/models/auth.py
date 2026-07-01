from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
import enum

class UserRole(str, enum.Enum):
    USER = "user"
    ADMIN = "admin"
    SUPERADMIN = "superadmin"


class Users(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=5)
    firstname: str = Field(..., min_length=1, max_length=50)
    lastname: Optional[str] = Field(default="", max_length=50)
    email: str = Field(..., pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
    active: bool = Field(default=True)
    role: Optional[UserRole] = Field(default=UserRole.USER)
    created_at: datetime = Field(
        default_factory=datetime.utcnow, description="Product creation timestamp")
    updated_at: datetime = Field(
        default_factory=datetime.utcnow, description="Last updated timestamp")


class CreateUserRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=5)
    firstname: str = Field(..., min_length=1, max_length=50)
    lastname: Optional[str] = Field(default="", max_length=50)
    email: str = Field(..., pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
    role: UserRole = Field(default=UserRole.USER)
    active: bool = Field(default=True)


class GetUserRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)


class ActivateUserRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)


class DeleteUserRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    permanent: bool = Field(default=False)


class UpdateUserRoleRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    role: UserRole


class CleanDatabaseRequest(BaseModel):
    collections: List[str] = Field(..., min_length=1)


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(..., min_length=5)
    new_password: str = Field(..., min_length=5)


class UpdateProfileRequest(BaseModel):
    firstname: str = Field(..., min_length=1, max_length=50)
    lastname: Optional[str] = Field(default="", max_length=50)
    email: str = Field(..., pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


class VerifyEmailRequest(BaseModel):
    otp: str = Field(..., min_length=4, max_length=10)


class LoginRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=5)


class PasswordResetRequest(BaseModel):
    identifier: str = Field(..., min_length=3, max_length=100)


class PasswordResetVerifyOtpRequest(BaseModel):
    identifier: str = Field(..., min_length=3, max_length=100)
    otp: str = Field(..., min_length=4, max_length=10)


class PasswordResetConfirmRequest(BaseModel):
    reset_token: str = Field(..., min_length=20)
    new_password: str = Field(..., min_length=5)


class UserResponse(Users):
    id: str
    created_at: datetime
    updated_at: datetime


class Token(BaseModel):
    access_token: str
    token_type: str
