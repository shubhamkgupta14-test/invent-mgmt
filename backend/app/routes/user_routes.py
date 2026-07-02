from fastapi import APIRouter, Depends, File, UploadFile
from typing import Annotated, Optional

from app.services.auth_service import get_current_user

from app.models.auth import (
    ChangePasswordRequest,
    CreateUserRequest,
    GetUserRequest,
    ActivateUserRequest,
    DeleteUserRequest,
    UpdateUserRoleRequest,
    UpdateProfileRequest,
    VerifyEmailRequest,
    CleanDatabaseRequest
)

from app.services.user_service import (
    create_user,
    get_all_users,
    get_user_by_username,
    activate_user,
    delete_user,
    get_me,
    update_user_role,
    clean_database_collections,
    change_password,
    update_my_profile,
    update_my_profile_image,
    reset_my_profile_image,
    request_email_verification,
    verify_email,
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
async def get_users_api(
    auth_user: user_dependency,
    search: Optional[str] = None,
    sort_by: str = "created_at",
    order: str = "desc",
    page: int = 1,
    limit: int = 10,
):

    users = await get_all_users(
        auth_user,
        search=search,
        sort_by=sort_by,
        order=order,
        page=page,
        limit=limit,
    )

    return success_response(
        message=Messages.USERS_FETCHED,
        data=users["items"],
        count=users["pagination"]["total"],
        pagination=users["pagination"],
    )

# GET ME


@router.get("/me")
async def get_me_api(auth_user: user_dependency):
    user = await get_me(auth_user)

    return success_response(
        message=Messages.USER_DETAILS_FETCHED,
        data=user
    )


@router.patch("/me")
async def update_me_api(
    auth_user: user_dependency,
    request: UpdateProfileRequest,
):
    user = await update_my_profile(auth_user, request.model_dump())

    return success_response(
        message=Messages.USER_DETAILS_FETCHED,
        data=user,
    )


@router.post("/me/profile-image")
async def update_my_profile_image_api(
    auth_user: user_dependency,
    file: UploadFile = File(...),
):
    user = await update_my_profile_image(auth_user, file)

    return success_response(
        message=Messages.USER_DETAILS_FETCHED,
        data=user,
    )


@router.delete("/me/profile-image")
async def reset_my_profile_image_api(auth_user: user_dependency):
    user = await reset_my_profile_image(auth_user)

    return success_response(
        message=Messages.USER_DETAILS_FETCHED,
        data=user,
    )


@router.post("/email-verification/request")
async def request_email_verification_api(auth_user: user_dependency):
    result = await request_email_verification(auth_user)

    return success_response(
        message=Messages.EMAIL_VERIFICATION_OTP_SENT,
        data=result,
    )


@router.post("/email-verification/verify")
async def verify_email_api(
    auth_user: user_dependency,
    request: VerifyEmailRequest,
):
    user = await verify_email(auth_user, request.otp)

    return success_response(
        message=Messages.EMAIL_VERIFIED,
        data=user,
    )


@router.patch("/password")
async def change_password_api(
    auth_user: user_dependency,
    request: ChangePasswordRequest,
):
    result = await change_password(
        auth_user=auth_user,
        current_password=request.current_password,
        new_password=request.new_password,
    )

    return success_response(
        message=Messages.USER_PASSWORD_UPDATED,
        data=result,
    )

# ACTIVATE USER


@router.patch("/activate")
async def activate_user_api(
    auth_user: user_dependency,
    user: ActivateUserRequest
):

    result = await activate_user(auth_user, user.username)

    return success_response(
        message=Messages.USER_ACTIVATED,
        data=result
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


@router.patch("/role")
async def update_user_role_api(
    auth_user: user_dependency,
    user: UpdateUserRoleRequest
):

    result = await update_user_role(auth_user, user.username, user.role)

    return success_response(
        message=Messages.USER_ROLE_UPDATED,
        data=result
    )


@router.delete("/clean-db")
async def clean_database_api(
    auth_user: user_dependency,
    request: CleanDatabaseRequest
):
    result = await clean_database_collections(auth_user, request.collections)

    return success_response(
        message=Messages.DATABASE_CLEANED,
        data=result
    )
