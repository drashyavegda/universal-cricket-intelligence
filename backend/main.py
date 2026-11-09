"""UCIP FastAPI service.

Optional compute service. The Next.js application is fully functional without it; this process
exists to move heavy statistics and batch simulations off the request path of a serverless
frontend.

Design rules:
* transport only — no business rules that the TypeScript core does not also implement;
* never echo secrets; never claim a capability that is not configured;
* deterministic responses (no timestamps inside numeric payloads).
"""
from __future__ import annotations

import logging
import time
from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from api.router import api_router
from core.config import settings
from core.errors import AppError, error_envelope
from core.logging import configure_logging, request_id_var
from middleware.request_id import RequestIdMiddleware
from monitoring.metrics import metrics

configure_logging(settings.log_level)
logger = logging.getLogger("ucip.api")
STARTED_AT = time.time()


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    logger.info(
        "service_start",
        extra={"env": settings.env, "cors_origins": settings.cors_origins, "token_required": settings.requires_token},
    )
    if not settings.requires_token:
        logger.warning(
            "auth_disabled: ANALYTICS_SERVICE_TOKEN is not set. Do not expose this service publicly."
        )
    yield
    logger.info("service_stop")


def create_app() -> FastAPI:
    app = FastAPI(
        title="UCIP Analytics API",
        version="1.0.0",
        description=(
            "Deterministic cricket statistics compute. Inputs in, validated statistics out. "
            "No AI, no fabrication, no persistence."
        ),
        docs_url="/docs" if settings.env != "production" else None,
        redoc_url=None,
        lifespan=lifespan,
    )

    app.add_middleware(RequestIdMiddleware)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST"],
        allow_headers=["content-type", "authorization", "x-request-id"],
        max_age=600,
    )

    @app.exception_handler(AppError)
    async def handle_app_error(_: Request, exc: AppError) -> JSONResponse:
        metrics.increment("errors_total")
        return JSONResponse(status_code=exc.status_code, content=error_envelope(exc))

    @app.exception_handler(Exception)
    async def handle_unexpected(_: Request, exc: Exception) -> JSONResponse:
        # Log the detail, return a generic envelope: stack traces never reach a client.
        metrics.increment("errors_total")
        logger.exception("unhandled_error", extra={"path": getattr(_, "url", None) and str(_.url.path)})
        return JSONResponse(
            status_code=500,
            content={
                "error": "Unexpected server error",
                "code": "SERVER_ERROR",
                "requestId": request_id_var.get(),
            },
        )

    @app.middleware("http")
    async def timing_middleware(request: Request, call_next):  # type: ignore[no-untyped-def]
        started = time.perf_counter()
        response = await call_next(request)
        elapsed_ms = (time.perf_counter() - started) * 1000
        metrics.observe_latency(elapsed_ms)
        metrics.increment("requests_total")
        response.headers["x-response-time-ms"] = f"{elapsed_ms:.1f}"
        return response

    app.include_router(api_router)
    return app


app = create_app()
