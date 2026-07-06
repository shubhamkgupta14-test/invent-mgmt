from typing import Optional
from typing import Annotated

from fastapi import (
    APIRouter,
    Depends
)

from app.services.auth_service import (
    get_current_user
)

from app.services.stock_service import (
    get_stocks,
    get_stock_by_barcode,
    calculate_selling_price,
    update_stock_actual_price,
    update_stock_barcode,
)
from app.models.stock import (
    SellingPriceCalculationRequest,
    StockActualPriceUpdate,
    StockBarcodeUpdate,
)

from app.utils.messages import Messages
from app.utils.response import success_response

router = APIRouter(
    prefix="/stocks",
    tags=["Stocks"]
)

user_dependency = Annotated[dict, Depends(get_current_user)]


@router.get("/")
async def get_stocks_api(
    auth_user: user_dependency,
    sku: Optional[str] = None,
    search: Optional[str] = None,
    stock_status: Optional[str] = None,
    sort_by: str = "created_at",
    sort_order: str = "desc",
    page: int = 1,
    limit: int = 10
):

    result = await get_stocks(
        auth_user=auth_user,
        sku=sku,
        search=search,
        stock_status=stock_status,
        sort_by=sort_by,
        sort_order=sort_order,
        page=page,
        limit=limit
    )

    return success_response(
        message=Messages.STOCKS_FETCHED,
        count=result["pagination"]["total"],
        data=result["items"],
        pagination=result["pagination"],
    )


@router.post("/selling-price/calculate")
async def calculate_selling_price_api(
    auth_user: user_dependency,
    req_body: SellingPriceCalculationRequest,
):
    result = await calculate_selling_price(
        auth_user=auth_user,
        calculation_data=req_body.model_dump(),
    )

    return success_response(
        message="Selling price calculated successfully",
        data=result,
    )


@router.get("/barcode/{barcode}")
async def get_stock_by_barcode_api(
    auth_user: user_dependency,
    barcode: str,
):
    result = await get_stock_by_barcode(
        auth_user=auth_user,
        barcode=barcode,
    )

    return success_response(
        message=Messages.STOCKS_FETCHED,
        data=result,
    )


@router.patch("/{sku}/actual-price")
async def update_stock_actual_price_api(
    auth_user: user_dependency,
    sku: str,
    req_body: StockActualPriceUpdate,
):
    result = await update_stock_actual_price(
        auth_user=auth_user,
        sku=sku,
        actual_price=req_body.actual_price,
    )

    return success_response(
        message="Actual price updated successfully",
        data=result,
    )


@router.patch("/{sku}/barcode")
async def update_stock_barcode_api(
    auth_user: user_dependency,
    sku: str,
    req_body: StockBarcodeUpdate,
):
    result = await update_stock_barcode(
        auth_user=auth_user,
        sku=sku,
        barcode=req_body.barcode,
    )

    return success_response(
        message="Barcode updated successfully",
        data=result,
    )
