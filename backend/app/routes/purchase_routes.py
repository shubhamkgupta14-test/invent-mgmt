from fastapi import APIRouter, Depends, File, UploadFile
from typing import Annotated, Optional

from app.services.auth_service import (
    get_current_user
)

from app.models.purchase import (
    CreatePurchaseRequest,
)

from app.services.purchase_service import (
    bulk_upload_purchases,
    create_purchase,
    get_purchases,
    get_purchase_by_purchase_id
)

from app.utils.messages import Messages

from app.utils.response import (
    success_response
)

router = APIRouter(
    prefix="/purchases",
    tags=["Purchases"]
)

user_dependency = Annotated[dict, Depends(get_current_user)]


@router.post("/create")
async def create_purchase_api(
    auth_user: user_dependency,
    purchase: CreatePurchaseRequest
):

    result = await create_purchase(
        auth_user,
        purchase.model_dump()
    )

    return success_response(
        message=Messages.PURCHASE_CREATED,
        data=result,
        status_code=201
    )


@router.post("/bulk-upload")
async def bulk_upload_purchases_api(
    auth_user: user_dependency,
    file: UploadFile = File(...),
):
    result = await bulk_upload_purchases(file, auth_user)

    return success_response(
        message="Bulk purchase upload completed",
        data=result,
    )


@router.get("/")
async def get_purchases_api(
    auth_user: user_dependency,
    purchase_id: Optional[str] = None,
    invoice_id: Optional[str] = None,
    supplier_id: Optional[str] = None,
    search: Optional[str] = None,
    sort_by: str = "created_at",
    order: str = "desc",
    page: int = 1,
    limit: int = 10
):
    purchases = await get_purchases(
        auth_user=auth_user,
        purchase_id=purchase_id,
        invoice_id=invoice_id,
        supplier_id=supplier_id,
        search=search,
        sort_by=sort_by,
        order=order,
        page=page,
        limit=limit,
    )

    return success_response(
        message=Messages.PURCHASES_FETCHED if purchases["items"] else Messages.NO_PURCHASES_FOUND,
        data=purchases["items"],
        count=purchases["pagination"]["total"],
        pagination=purchases["pagination"],
    )


@router.get("/purchase/{purchase_id}")
async def get_purchase_details_api(
    auth_user: user_dependency,
    purchase_id: str
):

    result = await get_purchase_by_purchase_id(
        auth_user=auth_user,
        purchase_id=purchase_id
    )

    return success_response(
        message=Messages.PURCHASES_FETCHED,
        data=result
    )
