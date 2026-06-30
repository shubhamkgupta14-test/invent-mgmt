from fastapi.responses import JSONResponse
from app.utils.messages import Messages


def success_response(
    message: str,
    data=None,
    status_code: int = 200,
    count: int = None,
    pagination: dict = None
):

    response = {
        "status": Messages.SUCCESS,
        "message": message,
        "data": data
    }

    if count is not None:
        response["count"] = count

    if pagination is not None:
        response["pagination"] = pagination

    return JSONResponse(
        status_code=status_code,
        content=response
    )


def failure_response(
    message: str,
    status_code: int = 400,
    data=None
):

    response = {
        "status": Messages.FAILURE,
        "message": message
    }

    if data is not None:
        response["data"] = data

    return JSONResponse(
        status_code=status_code,
        content=response
    )


def error_response(
    message: str = Messages.INTERNAL_SERVER_ERROR,
    data=None
):

    response = {
        "status": Messages.ERROR,
        "message": message
    }

    if data is not None:
        response["data"] = data

    return JSONResponse(
        status_code=500,
        content=response
    )
