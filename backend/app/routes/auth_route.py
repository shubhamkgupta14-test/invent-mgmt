from fastapi import APIRouter, Depends, status
from typing import Annotated
from fastapi.security import OAuth2PasswordRequestForm
from app.models.auth import Token

from app.services.auth_service import (
    get_token_service
)


router = APIRouter(
    prefix="/auth",
    tags=["Auth"]
)


@router.post("/login", response_model=Token, status_code=status.HTTP_200_OK)
async def login_api(form_data: Annotated[OAuth2PasswordRequestForm, Depends()]):
    return await get_token_service(form_data.username, form_data.password)
