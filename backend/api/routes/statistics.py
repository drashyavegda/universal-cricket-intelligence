"""Statistics endpoints.

Every response mirrors the shape the TypeScript core returns (values, sample size, method note) so
the BFF can swap sources without changing the UI contract.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends

from api.deps import require_service_token
from schemas.statistics import (
    CorrelationOut,
    CorrelationRequest,
    DescribeOut,
    DescribeRequest,
    ForecastQualityOut,
    ForecastQualityRequest,
    HistogramOut,
    HistogramRequest,
    MovingAverageOut,
    MovingAverageRequest,
    RegressionOut,
    RegressionRequest,
)
from services import statistics_service as stats

router = APIRouter(prefix="/stats", tags=["statistics"], dependencies=[Depends(require_service_token)])


@router.post("/describe", response_model=DescribeOut)
async def describe(payload: DescribeRequest) -> DescribeOut:
    return stats.describe(payload.values, payload.digits)


@router.post("/histogram", response_model=HistogramOut)
async def histogram(payload: HistogramRequest) -> HistogramOut:
    return stats.histogram(payload.values, payload.bins)


@router.post("/correlation", response_model=CorrelationOut)
async def correlation(payload: CorrelationRequest) -> CorrelationOut:
    return stats.pearson(payload.x, payload.y)


@router.post("/regression", response_model=RegressionOut)
async def regression(payload: RegressionRequest) -> RegressionOut:
    return stats.ols(payload.x, payload.y)


@router.post("/moving-average", response_model=MovingAverageOut)
async def moving_average(payload: MovingAverageRequest) -> MovingAverageOut:
    return stats.moving_average(payload.values, payload.window)


@router.post("/forecast-quality", response_model=ForecastQualityOut)
async def forecast_quality(payload: ForecastQualityRequest) -> ForecastQualityOut:
    return stats.forecast_quality(payload.probabilities, payload.outcomes)
