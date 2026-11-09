import math

import pytest

from app import compute


def test_describe_matches_hand_calculation():
    d = compute.describe([1, 2, 3, 4])
    assert d["n"] == 4
    assert d["mean"] == pytest.approx(2.5)
    assert d["median"] == pytest.approx(2.5)
    assert d["sd"] == pytest.approx(math.sqrt(5 / 3), rel=1e-6)
    assert d["ci95"][0] < d["mean"] < d["ci95"][1]
    assert d["sampleAdequacy"] == "small"


def test_describe_rejects_empty():
    with pytest.raises(compute.ComputeError):
        compute.describe([])


def test_describe_ignores_missing_values():
    d = compute.describe([10, None, 20])  # type: ignore[list-item]
    assert d["n"] == 2


def test_correlation_perfect_positive():
    r = compute.correlation([1, 2, 3, 4], [2, 4, 6, 8])
    assert r["pearsonR"] == pytest.approx(1.0)
    assert r["strength"] == "strong"


def test_correlation_needs_pairs():
    with pytest.raises(compute.ComputeError):
        compute.correlation([1, 2, 3], [1, 2])


def test_regression_recovers_line():
    x = list(range(10))
    y = [3 * v + 1 for v in x]
    r = compute.regression(x, y)
    assert r["slope"] == pytest.approx(3.0, rel=1e-6)
    assert r["intercept"] == pytest.approx(1.0, abs=1e-9)
    assert r["rSquared"] == pytest.approx(1.0, rel=1e-9)


def test_outliers_iqr_flags_extreme():
    o = compute.outliers([10, 11, 12, 11, 12, 10, 90], "iqr")
    assert o["flags"][-1] is True
    assert o["count"] == 1


def test_moving_average_window():
    m = compute.moving_average([1, 2, 3, 4, 5], 3)
    assert m["series"][2]["average"] == pytest.approx(2.0)
    assert m["series"][4]["average"] == pytest.approx(4.0)


def test_percentile_ranks_excludes_missing():
    items = [{"id": "a", "v": 10}, {"id": "b", "v": 20}, {"id": "c", "v": None}]
    ranks = compute.percentile_ranks(items, "v")
    assert [r["id"] for r in ranks] == ["b", "a"]
    assert len(ranks) == 2


def test_weighted_score_coverage_rescaling():
    rows = [
        {"id": "a", "m1": 10, "m2": None},
        {"id": "b", "m1": 20, "m2": 5},
        {"id": "c", "m1": 15, "m2": 9},
    ]
    out = compute.weighted_score(rows, {"m1": 1.0, "m2": 1.0})
    by_id = {r["id"]: r for r in out}
    assert by_id["a"]["metricsUsed"] == 1
    assert by_id["a"]["coverage"] == pytest.approx(0.5)
    # coverage rescaling means a player with one excellent metric does not outrank a complete record
    assert by_id["c"]["score"] >= by_id["a"]["score"]


def test_weighted_score_requires_weights():
    with pytest.raises(compute.ComputeError):
        compute.weighted_score([{"id": "a"}], {})
