from typing import Annotated, Optional

from fastapi import APIRouter, Depends

from app.models.invoice import InvoiceCreate
from app.services.auth_service import get_current_user
from app.services.invoice_service import (
    create_invoice,
    get_invoice,
    get_invoices,
)
from app.utils.response import success_response

router = APIRouter(
    prefix="/invoices",
    tags=["Invoices"],
)

user_dependency = Annotated[dict, Depends(get_current_user)]


@router.post("/create")
async def create_invoice_api(
    auth_user: user_dependency,
    invoice: InvoiceCreate,
):
    result = await create_invoice(auth_user, invoice.model_dump())

    return success_response(
        message="Invoice created successfully",
        data=result,
        status_code=201,
    )


@router.get("/")
async def get_invoices_api(
    auth_user: user_dependency,
    invoice_id: Optional[str] = None,
    search: Optional[str] = None,
    sort_by: str = "created_at",
    order: str = "desc",
    page: int = 1,
    limit: int = 10,
):
    result = await get_invoices(
        auth_user=auth_user,
        invoice_id=invoice_id,
        search=search,
        sort_by=sort_by,
        order=order,
        page=page,
        limit=limit,
    )

    return success_response(
        message="Invoices fetched successfully" if result["items"] else "No invoices found",
        data=result["items"],
        count=result["pagination"]["total"],
        pagination=result["pagination"],
    )


@router.get("/{invoice_record_id}")
async def get_invoice_api(
    auth_user: user_dependency,
    invoice_record_id: str,
):
    result = await get_invoice(auth_user, invoice_record_id)

    return success_response(
        message="Invoice fetched successfully",
        data=result,
    )
