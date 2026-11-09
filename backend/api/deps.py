"""Shared FastAPI dependencies.

The service is called by our own BFF, not by browsers, so identity is a shared bearer token rather
than a user session. When ``ANALYTICS_SERVICE_TOKEN`` is unset the check is skipped **and reported**
by ``/ready`` — a deployment must never believe it is protected when it is not.
"""
from __future__ import annotations

import hmac

from fastapi import Header

from core.config import settings
from core.errors import UnauthorizedError


async def require_service_token(authorization: str | None = Header(default=None)) -> None:
    """Reject the request unless a matching bearer token is presented (when one is configured)."""
    if not settings.requires_token:
        return

    scheme, _, token = (authorization or "").partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise UnauthorizedError()
    # Constant-time comparison: a timing side channel on a shared secret is a real risk.
    if not hmac.compare_digest(token.strip(), settings.service_token):
        raise UnauthorizedError()
