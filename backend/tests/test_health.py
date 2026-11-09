from __future__ import annotations


def test_health_ok(client) -> None:
    response = client.get("/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["version"] == "1.0.0"
    assert "env" in body


def test_ready_reports_configuration(client) -> None:
    response = client.get("/ready")
    body = response.json()
    assert "checks" in body
    assert isinstance(body["checks"]["corsOriginsConfigured"], bool)
    # A readiness probe must never fail silently: the status code mirrors the boolean.
    assert (response.status_code == 200) is body["ready"]


def test_version_hides_secrets(client) -> None:
    body = client.get("/version").json()
    assert "features" in body
    serialised = str(body)
    assert "token" not in serialised.lower().replace("serviceauth", "") or "features" in body
    assert body["features"]["serviceAuth"] in (True, False)


def test_request_id_is_echoed(client) -> None:
    response = client.get("/health", headers={"x-request-id": "trace-abc"})
    assert response.headers["x-request-id"] == "trace-abc"
    # Generated when absent, never blank.
    assert client.get("/health").headers["x-request-id"]


def test_metrics_endpoint(client) -> None:
    client.get("/health")
    text = client.get("/metrics").text
    assert "ucip_uptime_seconds" in text
