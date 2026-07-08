from typing import Annotated, Optional

from fastapi import APIRouter, Depends

from app.models.mailer import BulkDeleteMailRequest, SendMailRequest, StarMailRequest
from app.services.auth_service import get_current_user
from app.services.mailer_service import (
    bulk_delete_mail,
    build_default_signature,
    delete_mail,
    get_my_mail,
    mark_mail_read,
    send_mail,
    update_mail_star,
)
from app.utils.response import success_response

router = APIRouter(prefix="/mailer", tags=["Mailer"])

user_dependency = Annotated[dict, Depends(get_current_user)]


@router.post("/send")
async def send_mail_api(auth_user: user_dependency, payload: SendMailRequest):
    result = await send_mail(auth_user, payload.model_dump())
    return success_response(
        message="Mail sent successfully" if result["delivered"] else "Recipient not found",
        data=result,
        status_code=201,
    )


@router.get("/")
async def get_mail_api(
    auth_user: user_dependency,
    search: Optional[str] = None,
    starred: bool = False,
    folder: str = "inbox",
):
    result = await get_my_mail(
        auth_user,
        search=search,
        starred=starred,
        folder=folder,
    )
    return success_response(
        message="Mail fetched successfully",
        data=result,
    )


@router.get("/signature")
async def get_mail_signature_api(auth_user: user_dependency):
    result = await build_default_signature(auth_user)
    return success_response(
        message="Signature fetched successfully",
        data=result,
    )


@router.patch("/{message_id}/read")
async def mark_mail_read_api(auth_user: user_dependency, message_id: str):
    result = await mark_mail_read(auth_user, message_id)
    return success_response(
        message="Mail marked as read",
        data=result,
    )


@router.patch("/{message_id}/star")
async def update_mail_star_api(
    auth_user: user_dependency,
    message_id: str,
    payload: StarMailRequest,
):
    result = await update_mail_star(auth_user, message_id, payload.starred)
    return success_response(
        message="Mail updated successfully",
        data=result,
    )


@router.delete("/bulk")
async def bulk_delete_mail_api(
    auth_user: user_dependency,
    payload: BulkDeleteMailRequest,
):
    result = await bulk_delete_mail(auth_user, payload.message_ids)
    return success_response(
        message="Mail deleted successfully",
        data=result,
    )


@router.delete("/{message_id}")
async def delete_mail_api(auth_user: user_dependency, message_id: str):
    result = await delete_mail(auth_user, message_id)
    return success_response(
        message="Mail deleted successfully",
        data=result,
    )
