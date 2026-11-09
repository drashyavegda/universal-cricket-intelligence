"""Aggregate API router.

Kept flat and explicit so the OpenAPI document is stable and easy to diff in review.
"""
from __future__ import annotations

from fastapi import APIRouter

from api.routes import health, statistics

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(statistics.router)
