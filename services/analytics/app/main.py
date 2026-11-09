"""Optional Python analytics microservice.

The Next.js app is fully functional without it. When ANALYTICS_SERVICE_URL is
set, heavy computations can be offloaded here. Every endpoint is deterministic
and returns the method notes the UI displays alongside results.
"""
from __future__ import annotations

from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from . import compute

app = FastAPI(
    title="UCIP Analytics Service",
    version="1.0.0",
    description="Deterministic cricket analytics compute. No AI, no fabrication — inputs in, validated statistics out.",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)


class ValuesIn(BaseModel):
    values: list[float] = Field(default_factory=list)


class HistogramIn(ValuesIn):
    bins: int = 10


class PairsIn(BaseModel):
    x: list[float] = Field(default_factory=list)
    y: list[float] = Field(default_factory=list)


class SeriesIn(ValuesIn):
    window: int = 5


class OutlierIn(ValuesIn):
    method: str = "iqr"


class RankItem(BaseModel):
    id: str
    values: dict[str, float | None] = Field(default_factory=dict)


class WeightedIn(BaseModel):
    rows: list[dict[str, Any]] = Field(default_factory=list)
    weights: dict[str, float] = Field(default_factory=dict)


def _run(fn, *args, **kwargs):
    try:
        return fn(*args, **kwargs)
    except compute.ComputeError as exc:  # 422: the caller's data cannot support the analysis
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@app.get("/health")
def health() -> dict[str, Any]:
    return {
        "status": "ok",
        "service": "ucip-analytics",
        "version": "1.0.0",
        "engine": "numpy",
        "deterministic": True,
        "ai": False,
    }


@app.post("/describe")
def describe(payload: ValuesIn) -> dict[str, Any]:
    return _run(compute.describe, payload.values)


@app.post("/histogram")
def histogram(payload: HistogramIn) -> dict[str, Any]:
    return _run(compute.histogram, payload.values, payload.bins)


@app.post("/correlation")
def correlation(payload: PairsIn) -> dict[str, Any]:
    return _run(compute.correlation, payload.x, payload.y)


@app.post("/regression")
def regression(payload: PairsIn) -> dict[str, Any]:
    return _run(compute.regression, payload.x, payload.y)


@app.post("/outliers")
def outliers(payload: OutlierIn) -> dict[str, Any]:
    return _run(compute.outliers, payload.values, payload.method)


@app.post("/moving-average")
def moving_average(payload: SeriesIn) -> dict[str, Any]:
    return _run(compute.moving_average, payload.values, payload.window)


@app.post("/weighted-score")
def weighted_score(payload: WeightedIn) -> dict[str, Any]:
    return {"ranking": _run(compute.weighted_score, payload.rows, payload.weights)}


@app.post("/percentile-ranks")
def percentile_ranks(payload: WeightedIn) -> dict[str, Any]:
    metric = next(iter(payload.weights), None)
    if metric is None:
        raise HTTPException(status_code=422, detail="weights must name the metric to rank")
    rows = [{"id": r.get("id"), metric: r.get(metric)} for r in payload.rows]
    return {"ranking": _run(compute.percentile_ranks, rows, metric)}
