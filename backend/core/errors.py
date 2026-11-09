"""Typed application errors and the single error envelope.

Every failure returns the same shape the Next.js API uses, so the BFF can forward messages without
translation:

    { "error": "human readable", "code": "MACHINE_CODE", "requestId": "..." }
"""
from __future__ import annotations

from http import HTTPStatus

from core.logging import request_id_var


class AppError(Exception):
    """Expected, client-visible failure."""

    def __init__(self, message: str, code: str = "BAD_REQUEST", status_code: int = 400) -> None:
        super().__init__(message)
        self.message = message
        self.code = code
        self.status_code = status_code


class ValidationError(AppError):
    def __init__(self, message: str) -> None:
        super().__init__(message, code="VALIDATION_FAILED", status_code=HTTPStatus.UNPROCESSABLE_ENTITY)


class UnauthorizedError(AppError):
    def __init__(self, message: str = "Missing or invalid service token") -> None:
        super().__init__(message, code="UNAUTHORIZED", status_code=HTTPStatus.UNAUTHORIZED)


class UpstreamUnavailableError(AppError):
    def __init__(self, message: str = "Dependency unavailable") -> None:
        super().__init__(message, code="DEPENDENCY_UNAVAILABLE", status_code=HTTPStatus.SERVICE_UNAVAILABLE)


def error_envelope(exc: AppError) -> dict[str, str]:
    return {"error": exc.message, "code": exc.code, "requestId": request_id_var.get() or "-"}
