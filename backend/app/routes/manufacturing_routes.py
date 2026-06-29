from typing import Annotated, Optional

from fastapi import APIRouter, Depends

from app.models.manufacturing import CreateManufacturingRequest
from app.services.auth_service import get_current_user
from app.services.manufacturing_service import (
    create_manufacturing,
    get_manufacturing_by_id,
    get_manufacturing_records,
)
from app.utils.response import success_response

router = APIRouter(
    prefix="/manufacturing",
    tags=["Manufacturing"]
)

user_dependency = Annotated[dict, Depends(get_current_user)]


@router.post("/create")
async def create_manufacturing_api(
    auth_user: user_dependency,
    manufacturing: CreateManufacturingRequest
):
    result = await create_manufacturing(
        auth_user,
        manufacturing.model_dump()
    )

    return success_response(
        message="Manufacturing record created successfully",
        data=result,
        status_code=201
    )


@router.get("/")
async def get_manufacturing_api(
    auth_user: user_dependency,
    manufacturing_id: Optional[str] = None,
    batch_no: Optional[str] = None,
    sku: Optional[str] = None,
    sort_by: str = "created_at",
    order: str = "desc"
):
    records = await get_manufacturing_records(
        auth_user=auth_user,
        manufacturing_id=manufacturing_id,
        batch_no=batch_no,
        sku=sku,
        sort_by=sort_by,
        order=order
    )

    return success_response(
        message="Manufacturing records fetched successfully",
        data=records,
        count=len(records)
    )


@router.get("/{manufacturing_id}")
async def get_manufacturing_details_api(
    auth_user: user_dependency,
    manufacturing_id: str
):
    result = await get_manufacturing_by_id(
        auth_user=auth_user,
        manufacturing_id=manufacturing_id
    )

    return success_response(
        message="Manufacturing record fetched successfully",
        data=result
    )
