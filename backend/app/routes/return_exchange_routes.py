from fastapi import APIRouter, Depends
from typing import Annotated, Optional

from app.models.return_exchange import ExchangeCreate, ReturnCreate
from app.services.auth_service import get_current_user
from app.services.return_exchange_service import (
    create_exchange,
    create_return,
    get_exchanges,
    get_returns,
)
from app.utils.messages import Messages
from app.utils.response import success_response

user_dependency = Annotated[dict, Depends(get_current_user)]

return_router = APIRouter(prefix="/returns", tags=["Returns"])
exchange_router = APIRouter(prefix="/exchanges", tags=["Exchanges"])


@return_router.post("/create")
async def create_return_api(auth_user: user_dependency, payload: ReturnCreate):
    result = await create_return(auth_user, payload.model_dump())

    return success_response(
        message=Messages.RETURN_CREATED,
        data=result,
        status_code=201,
    )


@return_router.get("/")
async def get_returns_api(auth_user: user_dependency, return_id: Optional[str] = None):
    result = await get_returns(auth_user, return_id=return_id)

    return success_response(
        message=Messages.RETURNS_FETCHED if result else Messages.NO_RETURNS_FOUND,
        data=result,
        count=len(result),
    )


@exchange_router.post("/create")
async def create_exchange_api(auth_user: user_dependency, payload: ExchangeCreate):
    result = await create_exchange(auth_user, payload.model_dump())

    return success_response(
        message=Messages.EXCHANGE_CREATED,
        data=result,
        status_code=201,
    )


@exchange_router.get("/")
async def get_exchanges_api(auth_user: user_dependency, exchange_id: Optional[str] = None):
    result = await get_exchanges(auth_user, exchange_id=exchange_id)

    return success_response(
        message=Messages.EXCHANGES_FETCHED if result else Messages.NO_EXCHANGES_FOUND,
        data=result,
        count=len(result),
    )
