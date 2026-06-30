from fastapi import APIRouter, Depends
from typing import Annotated, Optional

from app.services.auth_service import get_current_user

from app.models.product import (
    ProductCreate,
    ProductUpdate,
    ProductDeleteRequest
)

from app.services.product_service import (
    add_product,
    get_all_products,
    get_product_form_options,
    get_product_options,
    get_product_by_sku,
    update_product_by_sku,
    delete_product_by_sku,
    filter_products_service
)

from app.core.exceptions import (
    bad_request
)

from app.utils.response import success_response
from app.utils.messages import Messages


router = APIRouter(
    prefix="/products",
    tags=["Products"]
)

user_dependency = Annotated[dict, Depends(get_current_user)]


# CREATE PRODUCT
@router.post("/add")
async def add_product_api(auth_user: user_dependency, product: ProductCreate):

    result = await add_product(
        product.model_dump(),
        auth_user
    )

    return success_response(
        message=Messages.PRODUCT_ADDED,
        data=result,
        status_code=201
    )


# GET ALL PRODUCTS
@router.get("/")
async def get_products_api(
    auth_user: user_dependency,
    search: Optional[str] = None,
    sort_by: str = "created_at",
    order: str = "desc",
    page: int = 1,
    limit: int = 10
):

    result = await get_all_products(
        auth_user,
        search=search,
        sort_by=sort_by,
        order=order,
        page=page,
        limit=limit,
    )

    return success_response(
        message=Messages.PRODUCTS_FETCHED if result["items"] else Messages.NO_PRODUCTS_FOUND,
        data=result["items"],
        count=result["pagination"]["total"],
        pagination=result["pagination"],
    )


@router.get("/options")
async def get_product_options_api(
    auth_user: user_dependency,
    active_only: bool = False
):

    products = await get_product_options(auth_user, active_only=active_only)

    return success_response(
        message=Messages.PRODUCTS_FETCHED if len(
            products) != 0 else Messages.NO_PRODUCTS_FOUND,
        data=products,
        count=len(products)
    )


@router.get("/form-options")
async def get_product_form_options_api(auth_user: user_dependency):

    options = await get_product_form_options(auth_user)

    return success_response(
        message=Messages.PRODUCTS_FETCHED,
        data=options
    )


# GET PRODUCT BY SKU


@router.get("/details/{sku}")
async def get_product_details_api(auth_user: user_dependency, sku: str):

    product = await get_product_by_sku(
        sku=sku,
        auth_user=auth_user
    )

    return success_response(
        message=Messages.PRODUCT_DETAILS_FETCHED,
        data=product
    )


# UPDATE PRODUCT
@router.put("/update/{sku}")
async def update_product_api(
    auth_user: user_dependency,
    sku: str,
    product: ProductUpdate
):

    update_data = product.model_dump(exclude_unset=True)
    if not update_data:
        bad_request(Messages.NO_UPDATE_FIELDS)

    updated_product = await update_product_by_sku(
        sku=sku,
        update_data=update_data,
        auth_user=auth_user
    )

    return success_response(
        message=Messages.PRODUCT_UPDATED,
        data=updated_product
    )


# DELETE PRODUCT
@router.delete("/delete")
async def delete_product_api(
        auth_user: user_dependency,
        product: ProductDeleteRequest):

    result = await delete_product_by_sku(product.sku, auth_user)
    data = {
        "sku": product.sku
    }

    return success_response(
        message=result,
        data=data
    )

# SEARCH PRODUCTS


@router.get("/filter")
async def filter_products_api(
    auth_user: user_dependency,
    sku: Optional[str] = None,
    name: Optional[str] = None,
    category: Optional[str] = None,
    supplier_id: Optional[str] = None,
    is_active: Optional[bool] = None
):
    result = await filter_products_service(
        sku=sku, name=name, category=category,
        supplier_id=supplier_id, is_active=is_active, auth_user=auth_user
    )

    return success_response(
        message=Messages.PRODUCTS_FETCHED if len(
            result) != 0 else Messages.NO_PRODUCTS_FOUND,
        count=len(result),
        data=result
    )
