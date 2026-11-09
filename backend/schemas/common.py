"""Shared response primitives."""
from __future__ import annotations

from pydantic import BaseModel, Field


class ErrorResponse(BaseModel):
    error: str = Field(description="Human-readable message")
    code: str = Field(description="Stable machine code, e.g. VALIDATION_FAILED")
    requestId: str | None = Field(default=None, description="Correlation id for support")


class MethodNote(BaseModel):
    method: str = Field(description="What was computed")
    assumptions: list[str] = Field(default_factory=list, description="Visible assumptions/limits")
    sampleSize: int = Field(description="Observations used — never hide this")
