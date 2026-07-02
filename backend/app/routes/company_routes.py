from fastapi import APIRouter, Depends, File, UploadFile
from typing import Annotated

from app.models.company import CompanySettingsUpdate
from app.services.auth_service import get_current_user
from app.services.company_service import (
    get_company_settings,
    update_company_settings,
    update_company_logo,
    reset_company_logo,
)
from app.utils.messages import Messages
from app.utils.response import success_response

router = APIRouter(
    prefix="/company",
    tags=["Company"]
)

user_dependency = Annotated[dict, Depends(get_current_user)]


@router.get("/settings")
async def get_company_settings_api(auth_user: user_dependency):
    settings = await get_company_settings(auth_user)

    return success_response(
        message=Messages.COMPANY_SETTINGS_FETCHED,
        data=settings,
    )


@router.put("/settings")
async def update_company_settings_api(
    auth_user: user_dependency,
    request: CompanySettingsUpdate,
):
    settings = await update_company_settings(auth_user, request.model_dump())

    return success_response(
        message=Messages.COMPANY_SETTINGS_UPDATED,
        data=settings,
    )


@router.post("/logo")
async def update_company_logo_api(
    auth_user: user_dependency,
    file: UploadFile = File(...),
):
    settings = await update_company_logo(auth_user, file)

    return success_response(
        message=Messages.COMPANY_SETTINGS_UPDATED,
        data=settings,
    )


@router.delete("/logo")
async def reset_company_logo_api(auth_user: user_dependency):
    settings = await reset_company_logo(auth_user)

    return success_response(
        message=Messages.COMPANY_SETTINGS_UPDATED,
        data=settings,
    )
