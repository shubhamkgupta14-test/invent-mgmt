from fastapi import APIRouter, Depends
from typing import Annotated

from app.services.auth_service import get_current_user

from app.models.auth import (
    CreateUserRequest,
    GetUserRequest,
    DeleteUserRequest
)

from app.services.user_service import (
    create_user,
    get_all_users,
    get_user_by_username,
    delete_user,
    get_me
)

from app.utils.messages import Messages
from app.utils.response import (
    success_response
)


router = APIRouter(
    prefix="/users",
    tags=["Users"]
)

user_dependency = Annotated[dict, Depends(get_current_user)]

# CREATE USER


@router.post("/create")
async def create_user_api(auth_user: user_dependency, user: CreateUserRequest):

    result = await create_user(auth_user, user.model_dump())

    return success_response(
        message=Messages.USER_CREATED,
        data=result,
        status_code=201
    )

# GET USER BY USERNAME


@router.post("/details")
async def get_user_details_api(auth_user: user_dependency, user: GetUserRequest):

    result = await get_user_by_username(auth_user, user.username)

    return success_response(
        message=Messages.USER_DETAILS_FETCHED,
        data=result
    )

# GET ALL USERS


@router.get("/")
async def get_users_api(auth_user: user_dependency):

    users = await get_all_users(auth_user)

    return success_response(
        message=Messages.USERS_FETCHED,
        data=users,
        count=len(users)
    )

# GET ME


@router.get("/me")
async def get_me_api(auth_user: user_dependency):
    user = await get_me(auth_user)

    return success_response(
        message=Messages.USER_DETAILS_FETCHED,
        data=user
    )

# DELETE USER


@router.delete("/delete")
async def delete_user_api(auth_user: user_dependency, user: DeleteUserRequest):

    result = await delete_user(auth_user, user.username, user.permanent)

    data = {
        "username": user.username
    }

    return success_response(
        message=result,
        data=data
    )
