"""Request/response models for the statistics endpoints.

Guard rails: bounded list sizes (a request cannot ask the service to chew through a million floats)
and window/bins ranges, so a malformed caller cannot take the process down.
"""
from __future__ import annotations

from pydantic import BaseModel, Field

from schemas.common import MethodNote

MAX_VALUES = 50_000


class ValuesIn(BaseModel):
    values: list[float] = Field(default_factory=list, max_length=MAX_VALUES)


class DescribeRequest(ValuesIn):
    digits: int = Field(default=2, ge=0, le=6)


class DescribeOut(BaseModel):
    count: int
    mean: float | None
    median: float | None
    stdev: float | None
    min: float | None
    max: float | None
    q1: float | None
    q3: float | None
    total: float
    method: MethodNote


class HistogramRequest(ValuesIn):
    bins: int = Field(default=10, ge=1, le=100)


class HistogramBin(BaseModel):
    start: float
    end: float
    count: int


class HistogramOut(BaseModel):
    bins: list[HistogramBin]
    method: MethodNote


class CorrelationRequest(BaseModel):
    x: list[float] = Field(default_factory=list, max_length=MAX_VALUES)
    y: list[float] = Field(default_factory=list, max_length=MAX_VALUES)


class CorrelationOut(BaseModel):
    r: float | None
    n: int
    method: MethodNote


class RegressionRequest(CorrelationRequest):
    pass


class RegressionOut(BaseModel):
    slope: float | None
    intercept: float | None
    r2: float | None
    n: int
    method: MethodNote


class MovingAverageRequest(ValuesIn):
    window: int = Field(default=5, ge=2, le=200)


class MovingAverageOut(BaseModel):
    series: list[float | None]
    window: int
    method: MethodNote


class ForecastQualityRequest(BaseModel):
    probabilities: list[float] = Field(default_factory=list, max_length=MAX_VALUES)
    outcomes: list[int] = Field(default_factory=list, max_length=MAX_VALUES)


class ForecastQualityOut(BaseModel):
    brier: float | None
    logLoss: float | None
    n: int
    method: MethodNote
