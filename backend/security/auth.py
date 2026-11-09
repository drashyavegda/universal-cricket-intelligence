"""Token utilities shared by dependencies and the worker.
"""
from __future__ import annotations

import hmac

from core.config import settings


def verify_token(candidate: str | None) -> bool:
    """Constant-time comparison against the configured service token."""
    if not settings.requires_token:
        return True
    if not candidate:
        return False
    return hmac.compare_digest(candidate.strip(), settings.service_token)


def redact(value: str | None, visible: int = 4) -> str:
    """Safe representation of a secret for logs: length + last four characters only."""
    if not value:
        return "(unset)"
    return f"***{value[-visible:]}" if len(value) > visible else "***"
