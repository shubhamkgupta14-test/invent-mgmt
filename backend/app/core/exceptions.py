from fastapi import HTTPException, status
from app.utils.messages import Messages


def raise_http_exception(status_code: int, message: str):
    raise HTTPException(
        status_code=status_code,
        detail=message
    )


def raise_credentials_exception():
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=Messages.INVALID_OR_EXPIRED_TOKEN,
        headers={"WWW-Authenticate": "Bearer"},
    )


def unauthorized(message: str = Messages.INVALID_CREDENTIALS):
    raise_http_exception(status.HTTP_401_UNAUTHORIZED, message)


def forbidden(message: str = Messages.ACCESS_DENIED):
    raise_http_exception(status.HTTP_403_FORBIDDEN, message)


def forbidden_or_expired():
    raise_credentials_exception()

def bad_request(message: str):
    raise_http_exception(status.HTTP_400_BAD_REQUEST, message)


def not_found(message: str):
    raise_http_exception(status.HTTP_404_NOT_FOUND, message)


def conflict(message: str):
    raise_http_exception(status.HTTP_409_CONFLICT, message)
