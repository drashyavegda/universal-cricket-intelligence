# Deploying the FastAPI service to Render

The `backend/` package is the Python service that Render hosts. It is **optional**: the Next.js
app computes everything in-process. Run it when you want heavy statistics/simulations off the
request path, or a background worker for report generation.

## 1. What Render hosts

| Service | Command | Port | Purpose |
| --- | --- | --- | --- |
| `ucip-api` (web) | `uvicorn main:app --host 0.0.0.0 --port $PORT` | 8000 | statistics/simulation endpoints |
| `ucip-worker` (background worker) | `python -m background_workers.worker` | — | queued jobs (report packs, batch scoring) |

## 2. Blueprint deploy

`render.yaml` (root) and `infrastructure/render/render.yaml` describe both services. Import the
repo in Render → **New → Blueprint**, or configure manually:

* Environment: **Python 3**
* Root directory: `backend`
* Build: `pip install -r requirements.txt`
* Start: `uvicorn main:app --host 0.0.0.0 --port $PORT`
* Health check path: `/health`

## 3. Environment variables

| Variable | Value | Secret |
| --- | --- | --- |
| `BACKEND_ENV` | `production` | no |
| `BACKEND_CORS_ORIGINS` | `https://your-domain.tld` (exact, comma-separated) | no |
| `BACKEND_LOG_LEVEL` | `info` | no |
| `ANALYTICS_SERVICE_TOKEN` | long random string | **yes** |
| `DATABASE_URL` | Supabase connection string | **yes** |
| `WORKER_POLL_SECONDS` | `15` | no |

Set secrets in Render's dashboard (Environment → Secret Files / Env Vars). Never commit them.

## 4. CORS — the mistake everyone makes

The service allows **only** the exact origins in `BACKEND_CORS_ORIGINS`. If you see
`blocked by CORS policy` in the browser console:

1. Confirm the origin has **no trailing slash** and the correct scheme (`https://`).
2. Remember Vercel preview URLs are different origins — add them explicitly if you want previews
   to call the API, or keep previews on local compute.
3. `allow_credentials` is `true`, so a wildcard `*` is rejected outright by design.

Calls that come from the Next.js server (server-side fetch) are not subject to CORS; browser
calls are.

## 5. Plan limits and free-tier behaviour

* Free instances **spin down** after ~15 minutes idle → first request after sleep takes ~30 s.
  Keep the health check generous (`start_period`), or use a paid instance for a pilot.
* 512 MB RAM is enough for the statistics service; avoid loading full datasets into memory.
* Background workers on free plans are not available — the worker service requires a paid plan.
  Without it, report generation stays in the Next.js app (which is the default anyway).

## 6. Connecting the Next.js app

```bash
# Vercel env
ANALYTICS_SERVICE_URL=https://ucip-api.onrender.com
ANALYTICS_SERVICE_TOKEN=<same secret>
ANALYTICS_TIMEOUT_MS=8000
```

The BFF calls the service with a timeout and falls back to local compute on failure — a sleeping
Render instance must never break a page.

## 7. Post-deploy checklist

- [ ] `curl https://ucip-api.onrender.com/health` → `{"status":"ok",…}`
- [ ] `curl -X POST https://ucip-api.onrender.com/stats/describe -H 'content-type: application/json' -d '{"values":[1,2,3]}'` → stats JSON
- [ ] CORS: `curl -i -H 'Origin: https://your-domain.tld' …` → `access-control-allow-origin` present
- [ ] A request from an origin **not** in the allow-list is rejected
- [ ] Logs show request ids and structured lines, not stack traces to clients
- [ ] Cold start under the configured `ANALYTICS_TIMEOUT_MS` (otherwise the app silently uses local compute)

## 8. Health & readiness

| Endpoint | Meaning |
| --- | --- |
| `GET /health` | process alive + version + uptime |
| `GET /ready` | dependencies configured (DB reachable if `DATABASE_URL` set) |
| `GET /docs` | OpenAPI UI (disable in production via `BACKEND_ENV=production` if you prefer) |
