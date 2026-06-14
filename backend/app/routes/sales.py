from fastapi import APIRouter, Depends
from typing import Annotated, Optional

from app.services.auth_service import get_current_user
from app.services.sales_service import (
    create_sale,
    get_sales,
)

from app.models.sale import SaleCreate
from app.utils.response import success_response
from app.utils.messages import Messages

router = APIRouter(
    prefix="/sales",
    tags=["Sales"]
)

user_dependency = Annotated[dict, Depends(get_current_user)]


@router.post("/create")
async def create_sale_api(
    auth_user: user_dependency,
    sale: SaleCreate
):

    result = await create_sale(
        auth_user,
        sale.model_dump()
    )

    return success_response(
        message=Messages.SALE_CREATED,
        data=result,
        status_code=201
    )


@router.get("/")
async def get_sales_api(
    auth_user: user_dependency,
    sale_id: Optional[str] = None,
    invoice_id: Optional[str] = None,
    sort_by: str = "created_at",
    order: str = "desc"
):
    sales = await get_sales(
        auth_user=auth_user,
        sale_id=sale_id,
        invoice_id=invoice_id,
        sort_by=sort_by,
        order=order
    )

    return success_response(
        message=Messages.SALES_FETCHED if len(
            sales) != 0 else Messages.NO_SALES_FOUND,
        data=sales,
        count=len(sales)
    )
