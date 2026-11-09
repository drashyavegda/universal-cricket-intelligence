# backend/api/ — HTTP layer

| File | Responsibility |
| --- | --- |
| `router.py` | single aggregate router, included by `main.create_app()` |
| `deps.py` | `require_service_token` — constant-time shared-token check |
| `routes/health.py` | `/health`, `/ready`, `/version` (+ `/metrics` in `main.py`) |
| `routes/statistics.py` | six `/stats/*` endpoints, each delegating to `services.statistics_service` |

Conventions:
1. A route does three things: validate (Pydantic), call a service, return a response model. No maths.
2. Every route that can fail raises `AppError` — the envelope is produced once, in `main.py`.
3. Response models are explicit (`response_model=`), so the OpenAPI schema is a real contract.
4. `/health` must never depend on a downstream service; `/ready` may.
