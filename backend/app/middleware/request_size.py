from starlette.datastructures import Headers
from starlette.responses import JSONResponse
from urllib.parse import parse_qsl

from app.utils.settings import Settings


class RequestSizeLimitMiddleware:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        headers = Headers(scope=scope)
        request_target_size = len(scope.get("raw_path", b"")) + len(scope.get("query_string", b""))
        if request_target_size > Settings.MAX_REQUEST_TARGET_BYTES:
            await self._reject_with_status(
                scope, receive, send, 414, "Request URL is too long"
            )
            return

        path = scope.get("path", "")
        if any(len(segment) > 500 for segment in path.split("/")):
            await self._reject_with_status(
                scope, receive, send, 414, "A request path segment is too long"
            )
            return

        query_string = scope.get("query_string", b"").decode("utf-8", errors="replace")
        if any(
            len(key) > 100 or len(value) > 500
            for key, value in parse_qsl(query_string, keep_blank_values=True)
        ):
            await self._reject_with_status(
                scope, receive, send, 414, "A query parameter is too long"
            )
            return

        raw_headers = scope.get("headers", [])
        header_size = sum(len(name) + len(value) for name, value in raw_headers)
        if len(raw_headers) > 100 or header_size > Settings.MAX_REQUEST_HEADER_BYTES:
            await self._reject_with_status(
                scope, receive, send, 431, "Request headers are too large"
            )
            return

        content_type = headers.get("content-type", "").lower()
        if "multipart/form-data" in content_type:
            limit = (Settings.BULK_UPLOAD_MAX_FILE_SIZE_MB + 1) * 1024 * 1024
        elif "application/x-www-form-urlencoded" in content_type:
            limit = 16 * 1024
        else:
            limit = Settings.MAX_REQUEST_BODY_BYTES

        content_length = headers.get("content-length")
        if content_length:
            try:
                if int(content_length) > limit:
                    await self._reject(scope, receive, send, limit)
                    return
            except ValueError:
                await self._reject(scope, receive, send, limit)
                return

        messages = []
        received = 0
        while True:
            message = await receive()
            messages.append(message)
            if message["type"] == "http.request":
                received += len(message.get("body", b""))
                if received > limit:
                    await self._reject(scope, receive, send, limit)
                    return
                if not message.get("more_body", False):
                    break
            elif message["type"] == "http.disconnect":
                return

        message_index = 0

        async def replay_receive():
            nonlocal message_index
            if message_index < len(messages):
                message = messages[message_index]
                message_index += 1
                return message
            return {"type": "http.request", "body": b"", "more_body": False}

        await self.app(scope, replay_receive, send)

    @staticmethod
    async def _reject(scope, receive, send, limit):
        await RequestSizeLimitMiddleware._reject_with_status(
            scope,
            receive,
            send,
            413,
            f"Request body exceeds the {limit} byte limit",
        )

    @staticmethod
    async def _reject_with_status(scope, receive, send, status_code, message):
        response = JSONResponse(
            status_code=status_code,
            content={
                "status": "failure",
                "message": message,
            },
        )
        await response(scope, receive, send)
