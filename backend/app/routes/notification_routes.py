from fastapi import APIRouter, Depends
from typing import Annotated

from app.models.notification import CreateNotificationRequest
from app.services.auth_service import get_current_user
from app.services.notification_service import (
    create_notification,
    delete_notification,
    get_all_notifications,
    get_my_notifications,
    mark_all_notifications_read,
    mark_notification_read,
    resend_notification,
)
from app.utils.response import success_response

router = APIRouter(prefix="/notifications", tags=["Notifications"])

user_dependency = Annotated[dict, Depends(get_current_user)]


@router.post("/create")
async def create_notification_api(
    auth_user: user_dependency,
    payload: CreateNotificationRequest
):
    result = await create_notification(auth_user, payload.model_dump())
    return success_response(
        message="Notification created successfully",
        data=result,
        status_code=201,
    )


@router.get("/")
async def get_notifications_api(
    auth_user: user_dependency,
    limit: int = 20,
    unread_only: bool = False
):
    result = await get_my_notifications(
        auth_user,
        limit=limit,
        unread_only=unread_only
    )
    return success_response(
        message="Notifications fetched successfully",
        data=result,
    )


@router.get("/all")
async def get_all_notifications_api(auth_user: user_dependency):
    result = await get_all_notifications(auth_user)
    return success_response(
        message="Notifications fetched successfully",
        data=result,
        count=len(result),
    )


@router.post("/{notification_id}/resend")
async def resend_notification_api(
    auth_user: user_dependency,
    notification_id: str
):
    result = await resend_notification(auth_user, notification_id)
    return success_response(
        message="Notification resent successfully",
        data=result,
        status_code=201,
    )


@router.patch("/{notification_id}/read")
async def mark_notification_read_api(
    auth_user: user_dependency,
    notification_id: str
):
    result = await mark_notification_read(auth_user, notification_id)
    return success_response(
        message="Notification marked as read",
        data=result,
    )


@router.patch("/read-all")
async def mark_all_notifications_read_api(auth_user: user_dependency):
    result = await mark_all_notifications_read(auth_user)
    return success_response(
        message="Notifications marked as read",
        data=result,
    )


@router.delete("/{notification_id}")
async def delete_notification_api(
    auth_user: user_dependency,
    notification_id: str
):
    result = await delete_notification(auth_user, notification_id)
    return success_response(
        message="Notification deleted successfully",
        data=result,
    )
