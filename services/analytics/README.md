# UCIP Analytics Service (optional)

FastAPI microservice for heavier deterministic statistics. **The Next.js app works without it** —
the TypeScript engine in `lib/core/stats` covers every in-app calculation. Point
`ANALYTICS_SERVICE_URL` at this service to offload cohort-scale work.

```bash
cd services/analytics
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000    # docs at /docs
pytest -q                                     # 12 tests
```

Endpoints: `GET /health`, `POST /describe`, `/histogram`, `/correlation`, `/regression`,
`/outliers`, `/moving-average`, `/weighted-score`, `/percentile-ranks`.

Rules honoured here:
- Missing values are dropped, never imputed.
- Small samples are labelled (`sampleAdequacy`), not silently trusted.
- 422 responses explain why an input cannot support the requested analysis.
- No AI and no network access: deterministic numbers only.
