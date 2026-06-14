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
    stock_status: Optional[str] = None,
    sort_by: str = "created_at",
    sort_order: str = "desc"
):

    result = await get_stocks(
        auth_user=auth_user,
        sku=sku,
        stock_status=stock_status,
        sort_by=sort_by,
        sort_order=sort_order
    )

    return success_response(
        message=Messages.STOCKS_FETCHED,
        count=len(result),
        data=result
    )
