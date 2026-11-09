"""Request correlation id.

Honours an inbound ``x-request-id`` (the Next.js BFF forwards one) or generates a short id, stores
it in a context variable for the log formatter, and echoes it on the response so a user-reported
error can be traced end to end.
"""
from __future__ import annotations

import uuid
from collections.abc import Awaitable, Callable

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from core.logging import request_id_var

HEADER = "x-request-id"


class RequestIdMiddleware(BaseHTTPMiddleware):
    async def dispatch(
        self, request: Request, call_next: Callable[[Request], Awaitable[Response]]
    ) -> Response:
        inbound = request.headers.get(HEADER, "").strip()
        request_id = inbound[:64] if inbound else uuid.uuid4().hex[:12]
        token = request_id_var.set(request_id)
        try:
            response = await call_next(request)
        finally:
            request_id_var.reset(token)
        response.headers[HEADER] = request_id
        return response
