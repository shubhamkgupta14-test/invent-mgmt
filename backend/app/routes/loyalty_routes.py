from typing import Annotated, Optional

from fastapi import APIRouter, Depends

from app.models.loyalty import LoyaltyCancel, LoyaltyOrderAdd, LoyaltyRedeem
from app.services.auth_service import get_current_user
from app.services.loyalty_service import (
    add_loyalty_order,
    cancel_loyalty,
    get_loyalty_config,
    get_loyalty_records,
    redeem_loyalty,
)
from app.utils.response import success_response

router = APIRouter(prefix="/loyalty", tags=["Loyalty"])

user_dependency = Annotated[dict, Depends(get_current_user)]


@router.get("/config")
async def get_loyalty_config_api(auth_user: user_dependency):
    return success_response(
        message="Loyalty config fetched successfully",
        data=get_loyalty_config(),
    )


@router.post("/orders")
async def add_loyalty_order_api(auth_user: user_dependency, payload: LoyaltyOrderAdd):
    result = await add_loyalty_order(auth_user, payload.model_dump())
    return success_response(
        message="Loyalty order added successfully",
        data=result,
        status_code=201,
    )


@router.post("/redeem")
async def redeem_loyalty_api(auth_user: user_dependency, payload: LoyaltyRedeem):
    result = await redeem_loyalty(auth_user, payload.model_dump())
    return success_response(
        message="Loyalty offer redeemed successfully",
        data=result,
    )


@router.post("/cancel")
async def cancel_loyalty_api(auth_user: user_dependency, payload: LoyaltyCancel):
    result = await cancel_loyalty(auth_user, payload.model_dump())
    return success_response(
        message="Loyalty offer cancelled successfully",
        data=result,
    )


@router.get("/")
async def get_loyalty_records_api(
    auth_user: user_dependency,
    email: Optional[str] = None,
    ref_no: Optional[str] = None,
    order_id: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    sort_by: str = "created_at",
    order: str = "desc",
    page: int = 1,
    limit: int = 10,
):
    result = await get_loyalty_records(
        auth_user,
        email=email,
        ref_no=ref_no,
        order_id=order_id,
        status=status,
        search=search,
        sort_by=sort_by,
        order=order,
        page=page,
        limit=limit,
    )

    return success_response(
        message="Loyalty records fetched successfully",
        data=result["items"],
        count=result["pagination"]["total"],
        pagination=result["pagination"],
    )
