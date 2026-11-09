# Deployment

## 0. Two ways to run this

| Mode | Storage | Needs | Use it for |
| --- | --- | --- | --- |
| Demo / pilot | JSON workspace store (`.data/store.json`) | Node 20 only | Evaluations, demos, single-team pilot |
| Production | PostgreSQL 14+ (`db/migrations/0001_init.sql`) | Node 20 + Postgres | Multi-user, multi-tenant deployments |

The application code is identical; only the persistence layer and environment change.

## 1. Local (fastest path)

```bash
npm install
cp .env.example .env.local      # optional: everything already has a safe default
npm run seed                    # writes .data/store.json (190 synthetic players)
npm run dev                     # http://localhost:3000
```

Sign in with `owner@demo.local` / `Demo#12345` (or analyst / scout / viewer — see README).

Optional Python analytics service:

```bash
cd services/analytics
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --port 8000
# then set ANALYTICS_SERVICE_URL=http://localhost:8000 in .env.local
```

## 2. Production build on a VM

```bash
npm ci
npm run typecheck && npm test
npm run build
NODE_ENV=production REFERENCE_DATE=2027-04-01 FIELD_ENCRYPTION_KEY=$(openssl rand -hex 32) \
  npm run start            # binds 0.0.0.0:3000
```

Put nginx/Caddy in front for TLS. Example Caddyfile:

```
analytics.example.com {
  encode zstd gzip
  reverse_proxy 127.0.0.1:3000
}
```

`NODE_ENV=production` makes the session cookie `Secure`. Do not run on plain HTTP in production.

## 3. Docker

```bash
docker compose up --build              # app only, demo mode
docker compose --profile analytics up  # + FastAPI service on :8000
docker compose --profile db up         # + Postgres 16, migrations auto-applied
```

The app container runs as a non-root user (`ucip`), keeps its store in the `ucip-data` volume and
exposes a `HEALTHCHECK` that hits `/api/health`.

## 4. PostgreSQL

```bash
psql "$DATABASE_URL" -f db/migrations/0001_init.sql
```

Then, for every request/transaction, set the tenant:

```sql
BEGIN;
SET LOCAL app.organisation_id = '<your-org-uuid>';
-- …queries…
COMMIT;
```

RLS policies fail closed: if `app.organisation_id` is unset, no rows are visible. Grant the
application role `SELECT/INSERT/UPDATE/DELETE` on business tables and only `SELECT/INSERT` on
`audit_log` (the trigger already blocks UPDATE/DELETE).

## 5. Environment variables

See `.env.example` for the annotated list. The ones that matter in production:

| Variable | Required | Purpose |
| --- | --- | --- |
| `REFERENCE_DATE` | recommended | Ages, workload windows and forecasts are computed relative to this date. Fix it for reproducibility. |
| `NODE_ENV=production` | yes | Secure cookies, no dev overlays. |
| `FIELD_ENCRYPTION_KEY` | yes | AES-256-GCM key for 2FA secrets. 32+ random bytes. |
| `DATABASE_URL` | if using Postgres | Connection string. |
| `AI_API_KEY` | optional | Enables live narration. Without it the platform runs in demo narration mode. |
| `AI_MONTHLY_BUDGET_USD` | optional | Hard budget stop for model calls. |
| `ANALYTICS_SERVICE_URL` | optional | Python compute service. |
| `DATA_DIR` | optional | Where the JSON store lives (default `.data`). Use a mounted volume. |

Never commit `.env*`. No secret is ever sent to the browser.

## 6. Backups and restore

JSON store:

```bash
tar czf ucip-data-$(date +%F).tgz .data/
# restore
tar xzf ucip-data-YYYY-MM-DD.tgz
```

PostgreSQL:

```bash
pg_dump "$DATABASE_URL" -Fc -f ucip-$(date +%F).dump
pg_restore -d "$DATABASE_URL" --clean ucip-YYYY-MM-DD.dump
```

Rehearse a restore quarterly; a backup you have never restored is a hypothesis.

## 7. Operations

- **Health**: `GET /api/health` (mode, counts, AI status, storage label, optional analytics
  reachability). Point your load balancer and uptime monitor at it.
- **Audit**: `/settings → Audit & activity` or `GET /api/audit`. Append-only.
- **AI spend**: `/settings` shows month-to-date spend, call count and the remaining budget.
- **Rate limiting**: in-process. Multi-instance deployments need a shared limiter (Redis) — the call
  site is `rateLimit(key, limit)` in `lib/core/auth/service.ts`.
- **Scaling**: the app is stateless apart from the store; run N instances behind a proxy once the
  store is Postgres. Keep simulations per request ≤ 5 000 for p95 latency under ~400 ms.
- **Logs**: stdout only. No PII beyond email addresses and no secrets are logged.

## 8. Upgrade path

1. Back up (`pg_dump` / tar).
2. Apply new migrations in order (`db/migrations/NNNN_*.sql`) inside a transaction.
3. `npm ci && npm run build && restart`.
4. Run `npm test` and `npm run smoke` against the new build.
5. Keep the previous image tagged for a one-command rollback.

## 9. What this deployment does *not* include

- No TLS certificate provisioning, DNS or CDN configuration.
- No managed secret store integration beyond environment variables.
- No CI pipeline file — wire `npm run typecheck && npm test && npm run test:py && npm run smoke`
  into your existing system.
- No penetration test, SOC 2 / ISO 27001 attestation, or claim thereof.

## Vercel

`vercel.json` is included and pins the security headers, a permanent HTTPS redirect and
`trailingSlash: false`.

1. Import the repository, framework preset **Next.js**, build `npm run build`.
2. Set environment variables (Production + Preview):
   `NEXT_PUBLIC_SITE_URL=https://your-domain.tld` (required for correct canonical/OG URLs
   and sitemap), `NEXT_PUBLIC_CONTACT_EMAIL`, optionally
   `NEXT_PUBLIC_GA_MEASUREMENT_ID`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY` +
   `TURNSTILE_SECRET_KEY`, `AI_API_KEY`, `DATA_DIR=/tmp/ucip` for ephemeral previews.
3. **Persistence:** the JSON store lives on the serverless filesystem, which is ephemeral.
   For a real deployment point `DATABASE_URL`/`DB_ADAPTER=postgres` at a managed Postgres
   (schema in `db/migrations/0001_init.sql`) or mount a durable volume.
4. TLS and the http→https redirect are handled by Vercel; leave `ENFORCE_HTTPS=false`.
5. After the first deploy add the domain to Search Console, submit `/sitemap.xml`, and
   confirm `/robots.txt`.

## Render

`render.yaml` is a ready blueprint (web service + 1 GB disk mounted at `/var/data`).

1. New → Blueprint → select the repo. Set `NEXT_PUBLIC_SITE_URL` and
   `NEXT_PUBLIC_CONTACT_EMAIL` in the dashboard (they are marked `sync: false`).
2. Health check is `/api/health`; the disk gives the JSON store durability.
3. Render terminates TLS and redirects http→https at the edge — `ENFORCE_HTTPS=false` is
   correct unless you add your own proxy in front.
4. `PUBLIC_PLAYER_PREVIEWS=false` is preset for hosted deployments so player share cards
   never name real, non-consented players.

## Post-deploy checklist (website quality)

- [ ] `curl -I https://your-domain` shows `Strict-Transport-Security` and the security headers
- [ ] `/robots.txt` references the production sitemap URL
- [ ] `/sitemap.xml` lists only `/`, `/tour`, `/faq`, `/testimonials`, `/contact`, `/privacy`
- [ ] Visiting `/dashboard` signed out redirects to `/login?next=%2Fdashboard`
- [ ] `/dashboard` response carries `X-Robots-Tag: noindex`
- [ ] `https://your-domain/opengraph-image` returns a 1200×630 PNG
- [ ] Social preview debuggers (e.g. any OG validator) resolve the card on `/` and `/faq`
- [ ] Contact form: submit once via the browser → thank-you reference appears; inbox row in
      Settings → Growth & trust
- [ ] GA4 property (if configured) shows `page_view` only after accepting the banner
- [ ] Replace or remove the three sample testimonials once real quotes are available
