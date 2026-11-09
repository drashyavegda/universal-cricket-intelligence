"""Deterministic statistics.

Deliberately mirrors the semantics of ``lib/core/stats/*`` in the TypeScript core:

* unknown is ``None``, never ``0``;
* every result carries a sample size and a method note;
* no imputation, no dropping of rows without saying so;
* population vs sample standard deviation is stated, not implied.
"""
from __future__ import annotations

import math
from statistics import median as _median

from schemas.common import MethodNote
from schemas.statistics import (
    CorrelationOut,
    DescribeOut,
    ForecastQualityOut,
    HistogramBin,
    HistogramOut,
    MovingAverageOut,
    RegressionOut,
)

EPSILON = 1e-12


def _clean(values: list[float]) -> list[float]:
    """Drop NaN/inf inputs (they break every downstream formula) and say so in the method note."""
    return [float(v) for v in values if isinstance(v, (int, float)) and math.isfinite(v)]


def _quantile(sorted_values: list[float], q: float) -> float | None:
    """Linear-interpolation quantile (the same convention used by the TS engine)."""
    if not sorted_values:
        return None
    if len(sorted_values) == 1:
        return sorted_values[0]
    position = (len(sorted_values) - 1) * q
    lower = math.floor(position)
    upper = math.ceil(position)
    if lower == upper:
        return sorted_values[lower]
    fraction = position - lower
    return sorted_values[lower] * (1 - fraction) + sorted_values[upper] * fraction


def describe(values: list[float], digits: int = 2) -> DescribeOut:
    data = sorted(_clean(values))
    removed = len(values) - len(data)
    count = len(data)
    total = sum(data)

    if count == 0:
        note = MethodNote(
            method="descriptive",
            assumptions=["No finite observations were supplied; every statistic is unknown."],
            sampleSize=0,
        )
        return DescribeOut(count=0, mean=None, median=None, stdev=None, min=None, max=None,
                           q1=None, q3=None, total=0.0, method=note)

    mean = total / count
    if count > 1:
        variance = sum((value - mean) ** 2 for value in data) / (count - 1)
        stdev: float | None = math.sqrt(variance)
        sd_note = "Sample standard deviation (n-1 denominator)."
    else:
        stdev = None
        sd_note = "Standard deviation is unknown for a single observation."

    assumptions = [sd_note, "Quantiles use linear interpolation."]
    if removed:
        assumptions.append(f"{removed} non-finite value(s) were excluded before computing.")
    if count < 10:
        assumptions.append("Fewer than 10 observations: treat these numbers as indicative only.")

    return DescribeOut(
        count=count,
        mean=round(mean, digits),
        median=round(_median(data), digits),
        stdev=None if stdev is None else round(stdev, digits),
        min=round(data[0], digits),
        max=round(data[-1], digits),
        q1=None if (q1 := _quantile(data, 0.25)) is None else round(q1, digits),
        q3=None if (q3 := _quantile(data, 0.75)) is None else round(q3, digits),
        total=round(total, digits),
        method=MethodNote(method="descriptive", assumptions=assumptions, sampleSize=count),
    )


def histogram(values: list[float], bins: int = 10) -> HistogramOut:
    data = _clean(values)
    if not data:
        return HistogramOut(
            bins=[],
            method=MethodNote(method="histogram", assumptions=["No observations; empty histogram."], sampleSize=0),
        )

    low, high = min(data), max(data)
    if math.isclose(low, high):
        # A degenerate range still needs one readable bucket rather than division by zero.
        return HistogramOut(
            bins=[HistogramBin(start=round(low, 4), end=round(high, 4), count=len(data))],
            method=MethodNote(
                method="histogram",
                assumptions=["All observations are identical; a single bucket is returned."],
                sampleSize=len(data),
            ),
        )

    width = (high - low) / bins
    counts = [0] * bins
    for value in data:
        index = min(int((value - low) / width), bins - 1)  # the maximum lands in the last bucket
        counts[index] += 1

    edges = [HistogramBin(start=round(low + index * width, 4), end=round(low + (index + 1) * width, 4),
                          count=counts[index]) for index in range(bins)]
    return HistogramOut(
        bins=edges,
        method=MethodNote(
            method="histogram",
            assumptions=["Equal-width bins; the maximum value is included in the final bin."],
            sampleSize=len(data),
        ),
    )


def pearson(x: list[float], y: list[float]) -> CorrelationOut:
    n = min(len(x), len(y))
    xs, ys = _clean(x[:n]), _clean(y[:n])
    if len(xs) != len(ys) or len(xs) < 3:
        return CorrelationOut(
            r=None,
            n=0,
            method=MethodNote(
                method="pearson",
                assumptions=["At least three paired finite observations are required; correlation is unknown."],
                sampleSize=0,
            ),
        )

    mean_x, mean_y = sum(xs) / len(xs), sum(ys) / len(ys)
    cov = sum((a - mean_x) * (b - mean_y) for a, b in zip(xs, ys))
    var_x = sum((a - mean_x) ** 2 for a in xs)
    var_y = sum((b - mean_y) ** 2 for b in ys)
    if var_x < EPSILON or var_y < EPSILON:
        return CorrelationOut(
            r=None,
            n=len(xs),
            method=MethodNote(
                method="pearson",
                assumptions=["Zero variance in one series; correlation is undefined, not zero."],
                sampleSize=len(xs),
            ),
        )

    return CorrelationOut(
        r=round(cov / math.sqrt(var_x * var_y), 4),
        n=len(xs),
        method=MethodNote(
            method="pearson",
            assumptions=["Pearson r measures linear association only.", "Correlation is not causation."],
            sampleSize=len(xs),
        ),
    )


def ols(x: list[float], y: list[float]) -> RegressionOut:
    n = min(len(x), len(y))
    xs, ys = _clean(x[:n]), _clean(y[:n])
    if len(xs) != len(ys) or len(xs) < 3:
        return RegressionOut(
            slope=None, intercept=None, r2=None, n=0,
            method=MethodNote(method="ols", assumptions=["At least three pairs are required."], sampleSize=0),
        )

    mean_x, mean_y = sum(xs) / len(xs), sum(ys) / len(ys)
    sxx = sum((a - mean_x) ** 2 for a in xs)
    if sxx < EPSILON:
        return RegressionOut(
            slope=None, intercept=None, r2=None, n=len(xs),
            method=MethodNote(method="ols", assumptions=["No variance in x; the slope is undefined."], sampleSize=len(xs)),
        )

    sxy = sum((a - mean_x) * (b - mean_y) for a, b in zip(xs, ys))
    slope = sxy / sxx
    intercept = mean_y - slope * mean_x
    ss_tot = sum((b - mean_y) ** 2 for b in ys)
    ss_res = sum((b - (intercept + slope * a)) ** 2 for a, b in zip(xs, ys))
    r2 = None if ss_tot < EPSILON else round(1 - ss_res / ss_tot, 4)

    return RegressionOut(
        slope=round(slope, 4),
        intercept=round(intercept, 4),
        r2=r2,
        n=len(xs),
        method=MethodNote(
            method="ols",
            assumptions=["Single predictor, ordinary least squares.", "Extrapolation beyond the observed x range is not supported."],
            sampleSize=len(xs),
        ),
    )


def moving_average(values: list[float], window: int = 5) -> MovingAverageOut:
    data = _clean(values)
    if window < 2 or len(data) < window:
        return MovingAverageOut(
            series=[None] * len(data),
            window=window,
            method=MethodNote(
                method="moving-average",
                assumptions=[
                    "Insufficient history for the requested window; no values are fabricated.",
                ],
                sampleSize=len(data),
            ),
        )

    series: list[float | None] = []
    total = 0.0
    for index, value in enumerate(data):
        total += value
        if index >= window:
            total -= data[index - window]
        series.append(round(total / window, 4) if index >= window - 1 else None)

    return MovingAverageOut(
        series=series,
        window=window,
        method=MethodNote(
            method="moving-average",
            assumptions=["Trailing window; the first (window-1) entries are null during warm-up."],
            sampleSize=len(data),
        ),
    )


def forecast_quality(probabilities: list[float], outcomes: list[int]) -> ForecastQualityOut:
    n = min(len(probabilities), len(outcomes))
    pairs = [
        (float(p), int(o))
        for p, o in zip(probabilities[:n], outcomes[:n])
        if math.isfinite(float(p)) and 0.0 <= float(p) <= 1.0 and int(o) in (0, 1)
    ]
    if not pairs:
        return ForecastQualityOut(
            brier=None, logLoss=None, n=0,
            method=MethodNote(method="forecast-quality", assumptions=["No valid (probability, outcome) pairs."], sampleSize=0),
        )

    brier = sum((p - o) ** 2 for p, o in pairs) / len(pairs)
    clipped = [(min(max(p, 1e-15), 1 - 1e-15), o) for p, o in pairs]
    log_loss = -sum(math.log(p) if o == 1 else math.log(1 - p) for p, o in clipped) / len(clipped)

    assumptions = ["Brier score and log loss are proper scoring rules: lower is better."]
    if len(pairs) < 30:
        assumptions.append("Fewer than 30 forecasts: calibration claims would not be meaningful.")

    return ForecastQualityOut(
        brier=round(brier, 4),
        logLoss=round(log_loss, 4),
        n=len(pairs),
        method=MethodNote(method="forecast-quality", assumptions=assumptions, sampleSize=len(pairs)),
    )
