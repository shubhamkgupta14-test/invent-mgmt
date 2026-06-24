from fastapi import APIRouter, Depends
from typing import Annotated

from app.services.auth_service import get_current_user
from app.models.supplier import (
    SupplierCreate,
    SupplierUpdate
)
from app.services.supplier_service import (
    add_supplier,
    get_all_suppliers,
    get_supplier_by_id,
    update_supplier_by_id
)
from app.utils.messages import Messages
from app.utils.response import success_response
from app.core.exceptions import bad_request

router = APIRouter(
    prefix="/suppliers",
    tags=["Suppliers"]
)

user_dependency = Annotated[dict, Depends(get_current_user)]


@router.post("/add")
async def add_supplier_api(auth_user: user_dependency, supplier: SupplierCreate):
    result = await add_supplier(
        supplier.model_dump(),
        auth_user
    )

    return success_response(
        message=Messages.SUPPLIER_ADDED,
        data=result,
        status_code=201
    )


@router.get("/")
async def get_suppliers_api(auth_user: user_dependency):
    suppliers = await get_all_suppliers(auth_user)
    return success_response(
        message=Messages.SUPPLIERS_FETCHED if len(
            suppliers) != 0 else Messages.NO_SUPPLIERS_FOUND,
        data=suppliers,
        count=len(suppliers)
    )


@router.get("/details/{supplier_id}")
async def get_supplier_details_api(auth_user: user_dependency, supplier_id: str):
    supplier = await get_supplier_by_id(
        supplier_id=supplier_id,
        auth_user=auth_user
    )
    return success_response(
        message=Messages.SUPPLIER_DETAILS_FETCHED,
        data=supplier
    )


@router.put("/update/{supplier_id}")
async def update_supplier_api(
    auth_user: user_dependency,
    supplier_id: str,
    supplier: SupplierUpdate
):
    update_data = supplier.model_dump(exclude_unset=True)
    if not update_data:
        bad_request(Messages.NO_UPDATE_FIELDS)

    updated_supplier = await update_supplier_by_id(
        supplier_id=supplier_id,
        update_data=update_data,
        auth_user=auth_user
    )

    return success_response(
        message=Messages.SUPPLIER_UPDATED,
        data=updated_supplier
    )
