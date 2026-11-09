from __future__ import annotations


def test_describe_basic(client, auth_headers) -> None:
    body = client.post("/stats/describe", json={"values": [1, 2, 3, 4, 5]}, headers=auth_headers).json()
    assert body["count"] == 5
    assert body["mean"] == 3
    assert body["median"] == 3
    assert body["method"]["sampleSize"] == 5


def test_describe_single_value_has_no_stdev(client, auth_headers) -> None:
    body = client.post("/stats/describe", json={"values": [7]}, headers=auth_headers).json()
    # Unknown, not zero — the honesty rule.
    assert body["stdev"] is None
    assert body["mean"] == 7


def test_describe_empty_is_explicit(client, auth_headers) -> None:
    body = client.post("/stats/describe", json={"values": []}, headers=auth_headers).json()
    assert body["count"] == 0
    assert body["mean"] is None


def test_correlation_requires_pairs(client, auth_headers) -> None:
    body = client.post("/stats/correlation", json={"x": [1, 2], "y": [2, 4]}, headers=auth_headers).json()
    assert body["r"] is None
    assert body["n"] == 0
    assert "three" in body["method"]["assumptions"][0].lower()


def test_correlation_perfect_linear(client, auth_headers) -> None:
    body = client.post("/stats/correlation", json={"x": [1, 2, 3, 4], "y": [2, 4, 6, 8]}, headers=auth_headers).json()
    assert body["r"] == 1.0


def test_regression_zero_variance_is_not_a_slope(client, auth_headers) -> None:
    body = client.post("/stats/regression", json={"x": [5, 5, 5], "y": [1, 2, 3]}, headers=auth_headers).json()
    assert body["slope"] is None


def test_histogram_max_lands_in_last_bin(client, auth_headers) -> None:
    body = client.post("/stats/histogram", json={"values": [0, 5, 10], "bins": 2}, headers=auth_headers).json()
    assert len(body["bins"]) == 2
    assert body["bins"][-1]["count"] >= 1
    assert sum(b["count"] for b in body["bins"]) == 3


def test_moving_average_insufficient_history(client, auth_headers) -> None:
    body = client.post("/stats/moving-average", json={"values": [1, 2], "window": 5}, headers=auth_headers).json()
    assert body["series"] == [None, None]


def test_forecast_quality_rejects_invalid_probabilities(client, auth_headers) -> None:
    body = client.post(
        "/stats/forecast-quality",
        json={"probabilities": [1.4, -0.2], "outcomes": [1, 0]},
        headers=auth_headers,
    ).json()
    assert body["brier"] is None
    assert body["n"] == 0


def test_stats_requires_token_when_configured(client, auth_headers) -> None:
    from core.config import settings

    if not settings.requires_token:
        return  # token disabled in this environment; /ready reports that openly
    response = client.post("/stats/describe", json={"values": [1, 2, 3]})
    assert response.status_code == 401
    assert response.json()["code"] == "UNAUTHORIZED"
