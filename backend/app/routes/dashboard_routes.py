from fastapi import APIRouter, Depends

from typing import Annotated

from app.services.dashboard_service import (
    get_dashboard_summary,
    get_low_stock_products,
    get_recent_purchases,
    get_recent_sales
)

from app.utils.response import (
    success_response
)

from app.services.auth_service import get_current_user
from app.utils.messages import Messages

router = APIRouter(
    prefix="/dashboard",
    tags=["Dashboard"]
)

user_dependency = Annotated[dict, Depends(get_current_user)]


@router.get("/summary")
async def dashboard_summary(auth_user: user_dependency):

    result = await get_dashboard_summary(auth_user)

    return success_response(
        message=Messages.DASHBOARD_SUMMARY_FETCHED,
        data=result
    )


@router.get("/low-stock")
async def low_stock_products(auth_user: user_dependency):

    result = await get_low_stock_products(auth_user)

    return success_response(
        message=Messages.LOW_STOCK_PRODUCTS_FETCHED,
        count=len(result),
        data=result
    )


@router.get("/recent-purchases")
async def recent_purchases(auth_user: user_dependency):

    result = await get_recent_purchases(auth_user)

    return success_response(
        message=Messages.RECENT_PURCHASES_FETCHED,
        count=len(result),
        data=result
    )


@router.get("/recent-sales")
async def recent_sales(auth_user: user_dependency):

    result = await get_recent_sales(auth_user)

    return success_response(
        message=Messages.RECENT_SALES_FETCHED,
        count=len(result),
        data=result
    )
