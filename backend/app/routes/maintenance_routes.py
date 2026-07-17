from typing import Annotated

from fastapi import APIRouter, Depends

from app.models.maintenance import MaintenanceConfigRequest
from app.services.auth_service import get_current_user
from app.services.admin_access_service import get_verified_superadmin
from app.services.maintenance_service import (
    get_admin_maintenance_config,
    get_maintenance_config,
    set_maintenance_config,
)
from app.utils.response import success_response

router = APIRouter(prefix="/maintenance", tags=["Maintenance"])
user_dependency = Annotated[dict, Depends(get_current_user)]
verified_admin_dependency = Annotated[dict, Depends(get_verified_superadmin)]


@router.get("/status")
async def get_maintenance_status_api():
    return success_response(
        message="Maintenance status fetched successfully",
        data=await get_maintenance_config(),
    )


@router.get("/config")
async def get_maintenance_config_api(auth_user: verified_admin_dependency):
    return success_response(
        message="Maintenance configuration fetched successfully",
        data=await get_admin_maintenance_config(auth_user),
    )


@router.put("/config")
async def set_maintenance_config_api(
    payload: MaintenanceConfigRequest,
    auth_user: verified_admin_dependency,
):
    return success_response(
        message="Maintenance configuration updated successfully",
        data=await set_maintenance_config(auth_user, payload),
    )
