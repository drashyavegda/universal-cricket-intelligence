# Environment variables

Legend — **R** required in production · **O** optional · **S** secret (server-only, never
`NEXT_PUBLIC_*`). Templates: [`.env.example`](../../.env.example), `infrastructure/vercel/`,
`infrastructure/render/`.

## Application (Next.js)

| Variable | R/O | S | Default | Purpose |
| --- | --- | --- | --- | --- |
| `NODE_ENV` | R | — | `development` | runtime mode |
| `PORT` | O | — | `3000` | listen port |
| `HOSTNAME` | O | — | `0.0.0.0` | bind address (containers) |
| `NEXT_PUBLIC_SITE_URL` | **R** | — | `http://localhost:3000` | canonical origin for canonical tags, OG URLs and every sitemap `<loc>` |
| `REFERENCE_DATE` | O | — | `2027-04-01` | "today" for ages and workload windows; keep fixed for reproducibility |
| `DEMO_MODE` | O | — | `true` | labels synthetic records; set `false` with real data |
| `DATA_DIR` | O | — | `.data` | JSON store location (mount a volume in containers) |

## Database

| Variable | R/O | S | Purpose |
| --- | --- | --- | --- |
| `DB_ADAPTER` | O | — | `json` (default) or `postgres` |
| `DATABASE_URL` | phase 3 | **S** | Postgres/Supabase connection string (prefer the pooler URL) |
| `DATABASE_SSL` | O | — | `true` for hosted Postgres |
| `DATABASE_POOL_MAX` | O | — | pool size (10 is sane for serverless poolers) |

## Storage (optional)

| Variable | R/O | S | Purpose |
| --- | --- | --- | --- |
| `STORAGE_DRIVER` | O | — | `local` (default) or `s3` |
| `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET` | O | — | S3-compatible target |
| `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` | O | **S** | credentials |
| `SUPABASE_URL` | O | — | project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | O | **S** | server-only storage/DB admin key |
| `SUPABASE_STORAGE_BUCKET` | O | — | default `ucip-uploads` (private) |

## AI (optional)

| Variable | R/O | S | Purpose |
| --- | --- | --- | --- |
| `AI_API_KEY` | O | **S** | provider key; absent ⇒ labelled deterministic narration |
| `AI_PROVIDER` | O | — | `demo` · `openai-compatible` · `anthropic` · `local` |
| `AI_BASE_URL`, `AI_MODEL` | O | — | endpoint/model id |
| `AI_MAX_TOKENS`, `AI_TEMPERATURE` | O | — | generation bounds |
| `AI_MONTHLY_BUDGET_USD` | O | — | hard stop; usage logged to `AiUsageEntry` |
| `AI_RATE_LIMIT_PER_MINUTE` | O | — | per-session throttle |

## Python backend (Render)

| Variable | R/O | S | Purpose |
| --- | --- | --- | --- |
| `BACKEND_ENV`, `BACKEND_LOG_LEVEL` | O | — | `production`, `info` |
| `BACKEND_CORS_ORIGINS` | **R** | — | exact origins, comma-separated, no wildcard in production |
| `NEXT_PUBLIC_API_URL` | no | — | FastAPI (Render) origin. **Public** — inlined into the browser bundle at build time. Origin only, no trailing slash. Local: `http://localhost:8000`. |
| `ANALYTICS_SERVICE_TOKEN` | no | — | Shared bearer token for FastAPI. **Secret** — server-only, must match the Render value. |
| `BACKEND_TIMEOUT_MS` | no | `4000` | Timeout for `/api/service/status` and `/api/service/describe`. |
| `ANALYTICS_SERVICE_URL` | O | — | how the web app reaches the service |
| `ANALYTICS_SERVICE_TOKEN` | O | **S** | shared bearer secret for service-to-service calls |
| `ANALYTICS_TIMEOUT_MS` | O | — | fallback-to-local threshold (default 8000) |
| `WORKER_POLL_SECONDS` | O | — | worker queue poll interval |

## Security

| Variable | R/O | S | Purpose |
| --- | --- | --- | --- |
| `FIELD_ENCRYPTION_KEY` | recommended | **S** | 32+ chars, AES-256-GCM for 2FA secrets |
| `SESSION_MINUTES` | O | — | session lifetime (720 default) |
| `ENFORCE_HTTPS` | O | — | `true` only if you front the app with your own proxy |
| `CANONICAL_HOST` | O | — | apex/www consolidation target |

## Limits

`MAX_UPLOAD_MB` (25) · `MAX_ROWS_PER_DATASET` (50000) · `PAGE_SIZE` (25)

## Website quality / growth

| Variable | R/O | S | Purpose |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_CONTACT_EMAIL` | O | — | reply-to in footer/privacy/contact |
| `NEXT_PUBLIC_TWITTER_HANDLE` | O | — | `twitter:site` / `twitter:creator` |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | O | — | GA4; loads only after consent |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | O | — | CAPTCHA widget (paired with the secret) |
| `TURNSTILE_SECRET_KEY` | O | **S** | server-side CAPTCHA verification |
| `PUBLIC_PLAYER_PREVIEWS` | O | — | `false` hides player names in dynamic share cards |

## Rules

1. `NEXT_PUBLIC_*` values are **inlined at build time** — changing one requires a redeploy.
2. Anything secret must be a plain env var on the server; never `NEXT_PUBLIC_*`.
3. Absent optional variables must degrade gracefully. That is a tested property, not a hope:
   no GA4 id ⇒ no script; no CAPTCHA key ⇒ other protections only; no AI key ⇒ deterministic
   narration; no database ⇒ JSON store.
4. Never commit `.env`, `.env.local` or secret files. `.gitignore` already excludes them.
