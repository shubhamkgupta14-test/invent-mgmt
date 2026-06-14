from fastapi import Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import (
    HTTPException,
    RequestValidationError
)

from app.utils.response import (
    failure_response,
    error_response
)

from app.utils.messages import Messages


async def http_exception_handler(
    request: Request,
    exc: HTTPException
):

    return failure_response(
        message=exc.detail,
        status_code=exc.status_code
    )


async def validation_exception_handler(
    request: Request,
    exc: RequestValidationError
):

    errors = []

    for error in exc.errors():

        field_name = ".".join(
            map(str, error["loc"])
        )

        errors.append({
            "field": field_name,
            "message": error["msg"]
        })

    return failure_response(
        message="Validation failed",
        status_code=422,
        data=errors
    )


async def global_exception_handler(
    request: Request,
    exc: Exception
):

    return error_response(
        message=Messages.INTERNAL_SERVER_ERROR
    )
