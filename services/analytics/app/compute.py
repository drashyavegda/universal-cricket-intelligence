"""Deterministic statistical compute for the Universal Cricket Intelligence Platform.

The Next.js application owns the domain model; this service is an optional
accelerator for heavier numerical work (large cohorts, regression, clustering).
Every function here is deterministic and dependency-light (numpy + pandas only).
No cricket data is invented: inputs are supplied by the caller.
"""
from __future__ import annotations

from typing import Any, Sequence

import numpy as np


class ComputeError(ValueError):
    """Raised for inputs that cannot be analysed (too few points, mismatched shapes)."""


def _arr(values: Sequence[float], name: str = "values") -> np.ndarray:
    arr = np.asarray([v for v in values if v is not None], dtype=float)
    if arr.size == 0:
        raise ComputeError(f"{name} is empty after removing missing values")
    if np.isnan(arr).any():
        arr = arr[~np.isnan(arr)]
    return arr


def describe(values: Sequence[float]) -> dict[str, Any]:
    a = _arr(values)
    n = int(a.size)
    mean = float(a.mean())
    sd = float(a.std(ddof=1)) if n > 1 else None
    q = np.percentile(a, [5, 25, 50, 75, 95])
    se = (sd / np.sqrt(n)) if sd is not None and n > 0 else None
    return {
        "n": n,
        "mean": round(mean, 6),
        "median": float(np.median(a)),
        "sd": None if sd is None else round(sd, 6),
        "min": float(a.min()),
        "max": float(a.max()),
        "p05": float(q[0]), "p25": float(q[1]), "p50": float(q[2]), "p75": float(q[3]), "p95": float(q[4]),
        "skewness": None if n < 3 or not sd else round(float(((a - mean) ** 3).mean() / sd**3), 6),
        "ci95": None if se is None else [round(mean - 1.96 * float(se), 6), round(mean + 1.96 * float(se), 6)],
        "sampleAdequacy": "small" if n < 20 else "moderate" if n < 60 else "adequate",
    }


def histogram(values: Sequence[float], bins: int = 10) -> dict[str, Any]:
    a = _arr(values)
    bins = max(2, min(int(bins), 60))
    counts, edges = np.histogram(a, bins=bins)
    return {
        "bins": [
            {"from": round(float(edges[i]), 4), "to": round(float(edges[i + 1]), 4), "count": int(counts[i])}
            for i in range(len(counts))
        ],
        "n": int(a.size),
    }


def correlation(x: Sequence[float], y: Sequence[float]) -> dict[str, Any]:
    ax, ay = _arr(x, "x"), _arr(y, "y")
    if ax.size != ay.size:
        raise ComputeError("x and y must have the same length")
    if ax.size < 3:
        raise ComputeError("need at least 3 paired observations")
    r = float(np.corrcoef(ax, ay)[0, 1])
    n = int(ax.size)
    # two-sided t approximation for the correlation coefficient
    t = None if abs(r) >= 1 else r * np.sqrt((n - 2) / (1 - r**2))
    return {
        "n": n,
        "pearsonR": round(r, 6),
        "rSquared": round(r * r, 6),
        "t": None if t is None else round(float(t), 4),
        "interpretation": "association only — correlation is not causation and does not adjust for confounders",
        "strength": "negligible" if abs(r) < 0.2 else "weak" if abs(r) < 0.4 else "moderate" if abs(r) < 0.7 else "strong",
    }


def regression(x: Sequence[float], y: Sequence[float]) -> dict[str, Any]:
    ax, ay = _arr(x, "x"), _arr(y, "y")
    if ax.size != ay.size:
        raise ComputeError("x and y must have the same length")
    if ax.size < 3:
        raise ComputeError("need at least 3 paired observations")
    slope, intercept = np.polyfit(ax, ay, 1)
    predicted = slope * ax + intercept
    ss_res = float(((ay - predicted) ** 2).sum())
    ss_tot = float(((ay - ay.mean()) ** 2).sum())
    r2 = 1 - ss_res / ss_tot if ss_tot else None
    dof = ax.size - 2
    se = float(np.sqrt(ss_res / dof)) if dof > 0 else None
    return {
        "n": int(ax.size),
        "slope": round(float(slope), 6),
        "intercept": round(float(intercept), 6),
        "rSquared": None if r2 is None else round(float(r2), 6),
        "residualSd": None if se is None else round(se, 6),
        "equation": f"y = {slope:.4f}x + {intercept:.4f}",
        "caveat": "Ordinary least squares on the supplied points. Small cohorts produce unstable slopes; treat as descriptive.",
    }


def outliers(values: Sequence[float], method: str = "iqr") -> dict[str, Any]:
    a = _arr(values)
    if method == "zscore":
        sd = a.std(ddof=1) if a.size > 1 else 0
        if not sd:
            raise ComputeError("zero variance — z-scores are undefined")
        z = (a - a.mean()) / sd
        flags = np.abs(z) > 3
        return {"method": "zscore", "threshold": 3, "flags": [bool(f) for f in flags], "zScores": [round(float(v), 4) for v in z]}
    q1, q3 = np.percentile(a, [25, 75])
    iqr = float(q3 - q1)
    low, high = float(q1 - 1.5 * iqr), float(q3 + 1.5 * iqr)
    flags = (a < low) | (a > high)
    return {"method": "iqr", "lower": round(low, 4), "upper": round(high, 4), "flags": [bool(f) for f in flags], "count": int(flags.sum())}


def moving_average(values: Sequence[float], window: int = 5) -> dict[str, Any]:
    a = _arr(values)
    window = max(2, min(int(window), a.size))
    series = []
    for i in range(a.size):
        lo = max(0, i - window + 1)
        series.append({"index": i, "value": float(a[i]), "average": round(float(a[lo : i + 1].mean()), 6)})
    return {"window": window, "series": series}


def percentile_ranks(items: Sequence[dict[str, Any]], metric: str, higher_is_better: bool = True) -> list[dict[str, Any]]:
    """Percentile rank per id. Missing values are excluded, never imputed."""
    valid = [(i["id"], float(i[metric])) for i in items if i.get(metric) is not None]
    if not valid:
        raise ComputeError(f"no numeric '{metric}' values supplied")
    values = np.array([v for _, v in valid], dtype=float)
    ranks: list[dict[str, Any]] = []
    for pid, value in valid:
        below = float((values < value).sum())
        equal = float((values == value).sum())
        pct = (below + 0.5 * equal) / values.size
        if not higher_is_better:
            pct = 1 - pct + 1 / values.size
        ranks.append({"id": pid, "value": value, "percentile": round(pct * 100, 3)})
    ranks.sort(key=lambda r: r["percentile"], reverse=True)
    return ranks


def weighted_score(rows: Sequence[dict[str, Any]], weights: dict[str, float]) -> list[dict[str, Any]]:
    """Weighted percentile score with coverage rescaling, identical to the TS engine."""
    if not rows or not weights:
        raise ComputeError("rows and weights are required")
    metrics = {m: w for m, w in weights.items() if w > 0}
    columns: dict[str, dict[str, float]] = {}
    for m in metrics:
        present = [(r["id"], float(r[m])) for r in rows if r.get(m) is not None]
        if not present:
            columns[m] = {}
            continue
        vals = np.array([v for _, v in present])
        columns[m] = {pid: float((vals < v).sum() + 0.5 * (vals == v).sum()) / vals.size * 100 for pid, v in present}
    out = []
    total_weight = sum(metrics.values())
    for r in rows:
        num = 0.0
        den = 0.0
        used = 0
        for m, w in metrics.items():
            pct = columns[m].get(r["id"])
            if pct is None:
                continue
            num += w * pct
            den += w
            used += 1
        score = (num / den) * (den / total_weight) if den else 0.0
        out.append({"id": r["id"], "score": round(score, 3), "metricsUsed": used, "coverage": round(den / total_weight, 3)})
    out.sort(key=lambda x: x["score"], reverse=True)
    return out
