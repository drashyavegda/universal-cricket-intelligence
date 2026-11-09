"""Liveness, readiness and build information.

Render uses ``/health`` as the health check path. Readiness distinguishes "process is up" from
"configuration is complete", so a misconfigured deploy is visible instead of silently degraded.
"""
from __future__ import annotations

import time

from fastapi import APIRouter, Response

from core.config import settings
from monitoring.metrics import metrics as _metrics

router = APIRouter(tags=["system"])
STARTED_AT = time.time()


@router.get("/health")
async def health() -> dict[str, object]:
    return {
        "status": "ok",
        "service": settings.service_name,
        "env": settings.env,
        "uptimeSeconds": round(time.time() - STARTED_AT, 1),
        "version": "1.0.0",
    }


@router.get("/ready")
async def ready(response: Response) -> dict[str, object]:
    checks = {
        "tokenConfigured": settings.requires_token,
        "corsOriginsConfigured": bool(settings.cors_origins),
        "databaseConfigured": bool(settings.database_url),
    }
    # Not configured is not fatal for a stateless compute service, but it must be visible.
    ready_state = checks["corsOriginsConfigured"]
    if not ready_state:
        response.status_code = 503
    return {"ready": ready_state, "checks": checks}


@router.get("/version")
async def version() -> dict[str, object]:
    """Build information with no secrets: booleans only."""
    return {
        "service": settings.service_name,
        "apiVersion": "1.0.0",
        "env": settings.env,
        "python": f"{__import__('sys').version_info.major}.{__import__('sys').version_info.minor}",
        "features": {
            "serviceAuth": settings.requires_token,
            "database": bool(settings.database_url),
        },
    }


@router.get("/metrics", include_in_schema=False)
async def metrics_endpoint() -> Response:
    """Prometheus-style text output. Operational telemetry only — never user data."""
    return Response(content=_metrics.render(), media_type="text/plain; version=0.0.4")
