# backend/ — FastAPI service (phase 2)

A **standalone, optional** Python service for heavy compute: statistics, Monte Carlo batches and
(externally queued) report jobs. It is the deployable expansion of the existing
`services/analytics` service, which stays untouched until parity tests pass.

> **Status:** scaffold. It runs, has tests, and is documented — but the Next.js application does
> **not** depend on it. Nothing here is claimed as integrated: the BFF keeps computing in-process
> and falls back locally on any failure. Phase 4 wires it in with parity tests.

## 1. What it owns / does not own

| Owns | Does not own |
| --- | --- |
| Transport concerns: config, logging, CORS allow-list, request ids, error envelope | Authentication of end users (the Next.js app holds sessions) |
| Heavy numeric endpoints under `/stats/*` | Player records, uploads, reports (those stay in the Next app until phase 4) |
| Health/readiness/metrics | Permissions — the caller is a trusted service, gated by a shared token |

## 2. Run locally

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000     # docs at /docs, health at /health
pytest -q                                  # 15 tests, no network
```

Or from the repository root: `npm run api:dev`, `npm run test:py`.

## 3. Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/health` | liveness + version + uptime |
| GET | `/ready` | readiness: DB configured? token configured? |
| GET | `/version` | build info (no secrets) |
| POST | `/stats/describe` | mean/median/sd/quantiles with method notes |
| POST | `/stats/histogram` | bucketed distribution |
| POST | `/stats/correlation` | Pearson r on equal-length series |
| POST | `/stats/regression` | OLS slope/intercept/r² |
| POST | `/stats/moving-average` | windowed mean, warm-up nulls |
| POST | `/stats/forecast-quality` | Brier score + log loss |
| GET | `/metrics` | in-process counters (requests, errors, latency buckets) |

## 4. Security model

* Optional shared bearer token (`ANALYTICS_SERVICE_TOKEN`); when unset the service runs in
  local-trust mode and **must not be exposed publicly**.
* CORS allows only the exact origins in `BACKEND_CORS_ORIGINS`; `allow_credentials` is on, so a
  wildcard is rejected by design.
* No secrets are ever echoed in responses; `/version` reports booleans only.
* Request bodies are size-limited and validated by Pydantic; nothing is written to disk.

## 5. Deployment

See [`../docs/deployment/RENDER.md`](../docs/deployment/RENDER.md). Root directory `backend`,
start `uvicorn main:app --host 0.0.0.0 --port $PORT`, health check `/health`, secrets set in the
Render dashboard.

## 6. Parity rule before phase 4

The same input must produce the same numbers here as in `lib/core/stats/*`. Until a parity test
compares them for a fixed fixture set, the Next app keeps computing locally. Do not flip
`ANALYTICS_SERVICE_URL` in production before that test exists.
