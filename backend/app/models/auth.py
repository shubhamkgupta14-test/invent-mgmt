from pydantic import AfterValidator, Field
from app.models.base import SecureBaseModel
from typing import Annotated, List, Optional
from datetime import datetime
import enum


def validate_strong_password(value: str):
    if not any(character.isalpha() for character in value):
        raise ValueError("Password must include at least one letter")
    if not any(character.isdigit() for character in value):
        raise ValueError("Password must include at least one number")
    if not any(not character.isalnum() for character in value):
        raise ValueError("Password must include at least one special character")
    return value


StrongPassword = Annotated[
    str,
    Field(min_length=8, max_length=128),
    AfterValidator(validate_strong_password),
]

class UserRole(str, enum.Enum):
    USER = "user"
    ADMIN = "admin"
    SUPERADMIN = "superadmin"


class Users(SecureBaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    password: StrongPassword
    firstname: str = Field(..., min_length=1, max_length=50)
    lastname: Optional[str] = Field(default="", max_length=50)
    email: str = Field(..., pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
    active: bool = Field(default=True)
    role: Optional[UserRole] = Field(default=UserRole.USER)
    created_at: datetime = Field(
        default_factory=datetime.utcnow, description="Product creation timestamp")
    updated_at: datetime = Field(
        default_factory=datetime.utcnow, description="Last updated timestamp")


class CreateUserRequest(SecureBaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    password: StrongPassword
    firstname: str = Field(..., min_length=1, max_length=50)
    lastname: Optional[str] = Field(default="", max_length=50)
    email: str = Field(..., pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
    role: UserRole = Field(default=UserRole.USER)
    active: bool = Field(default=True)


class GetUserRequest(SecureBaseModel):
    username: str = Field(..., min_length=3, max_length=50)


class ActivateUserRequest(SecureBaseModel):
    username: str = Field(..., min_length=3, max_length=50)


class DeleteUserRequest(SecureBaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    permanent: bool = Field(default=False)


class UpdateUserRoleRequest(SecureBaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    role: UserRole


class CleanDatabaseRequest(SecureBaseModel):
    collections: List[str] = Field(..., min_length=1, max_length=25)


class ChangePasswordRequest(SecureBaseModel):
    current_password: str = Field(..., min_length=5)
    new_password: StrongPassword


class UpdateProfileRequest(SecureBaseModel):
    firstname: str = Field(..., min_length=1, max_length=50)
    lastname: Optional[str] = Field(default="", max_length=50)
    email: str = Field(..., pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


class VerifyEmailRequest(SecureBaseModel):
    otp: str = Field(..., min_length=4, max_length=10)


class LoginRequest(SecureBaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=1, max_length=128)


class PasswordResetRequest(SecureBaseModel):
    identifier: str = Field(..., min_length=3, max_length=100)


class PasswordResetVerifyOtpRequest(SecureBaseModel):
    identifier: str = Field(..., min_length=3, max_length=100)
    otp: str = Field(..., min_length=4, max_length=10)


class PasswordResetConfirmRequest(SecureBaseModel):
    reset_token: str = Field(..., min_length=20, max_length=128)
    new_password: StrongPassword


class UserResponse(Users):
    id: str
    created_at: datetime
    updated_at: datetime


class Token(SecureBaseModel):
    access_token: str
    token_type: str
