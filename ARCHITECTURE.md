# Architecture

Deep-dive companions: [`docs/architecture/`](docs/architecture/) (layer map, AI contract,
website-quality module, data flow), [`docs/database/SCHEMA_REFERENCE.md`](docs/database/SCHEMA_REFERENCE.md),
[`docs/api/API_REFERENCE.md`](docs/api/API_REFERENCE.md), and ADRs in [`docs/decisions/`](docs/decisions/).

---

## 1. Runtime topology

### Phase 1 — shipped and supported (single Next.js app)

| Concern | Implementation |
| --- | --- |
| Frontend + BFF | Next.js 14.2.15 App Router, React 18.3.1, Tailwind 3.4.13 |
| Server compute | Route handlers (`app/api/**`) calling `lib/core/**` engines in-process |
| Persistence | `lib/core/db/store.ts` → JSON document at `DATA_DIR` (default `.data/store.json`); PostgreSQL path when `DATABASE_URL` + `DB_ADAPTER=postgres` |
| Auth | scrypt password hashing, opaque server-side sessions, HttpOnly cookie `ucip_session` (12 h), optional TOTP 2FA |
| Optional compute | `services/analytics` FastAPI (2 source files) for heavy statistics, off by default |
| Static/SEO | `app/sitemap.ts`, `app/robots.ts`, `app/opengraph-image.tsx`, metadata registry `lib/site.ts` |
| Edge middleware | `middleware.ts` — session gate, HTTPS/canonical redirect, security + `X-Robots-Tag` headers |

### Phase 2 — scaffolded here (hybrid deployment)

```
Browser ──► Vercel: Next.js (frontend + BFF)
                 │  CORS-allowed, token-authenticated JSON
                 ▼
            Render: FastAPI (backend/)  ──► Supabase PostgreSQL
                 │                              ▲
                 └──► Supabase Storage (uploads, generated reports)
                 └──► Background worker (backend/background_workers)
```

Nothing in phase 2 is required for the app to run. The Render services are optional
offload; Next.js keeps serving analytics if they are down (documented degradation).

## 2. Layering inside the app

```
app/(public)/**      static content + published testimonials only
app/(app)/**         session-validated workspace pages (noindex)
app/api/**           HTTP boundary: guard(permission) → readBody → engine → json/fail
lib/core/**          deterministic domain engines (pure where possible)
lib/core/db/store.ts the only persistence boundary (JSON today, Postgres next)
lib/client/**        browser fetch + analytics façade
components/**        presentational + interaction components
lib/site.ts          single source of truth for page metadata and public/private route lists
```

Enforced conventions:

* A route handler never contains domain maths. It validates input, calls an engine, maps the
  result, and returns `json()` / `fail()`.
* Engines never import React, `next/*`, or the request object — they are unit-testable in Node.
* `lib/core/db/store.ts` is the only module allowed to touch the filesystem or a DB driver.
* The AI gateway is the only module allowed to make outbound model calls; it is disabled
  without a key and always returns a labelled fallback.

## 3. Domain model and data flow

```
upload → parse (format sniff) → map (synonyms) → validate (rules)
      → preview/correct → approve (permission + audit) → promote to Player records
      → metrics / rankings / valuation / simulation / reports → export
```

* `Dataset` → `DatasetRecord` (raw + mapped fields, issues, status, confidence).
* Approval promotes approved records into `Player` objects; demo records are replaced rather
  than duplicated.
* Every downstream engine reads `Player` (plus `Match`, `Team`, `Venue`, `WeatherObservation`),
  so uploaded and synthetic data are interchangeable.
* Provenance (`sources[]`), `confidence` and `synthetic` travel with the record into the UI.

## 4. AI architecture

| Layer | File | Responsibility |
| --- | --- | --- |
| Intent parsing | `lib/core/ai/nlq.ts` | Map natural language (EN/HI/GU) to a typed intent + entities; detects write intents first |
| Assistant | `lib/core/ai/assistant.ts` | Route intent → deterministic engine → assemble evidence block; require confirmation for writes |
| Agents | `lib/core/ai/agents.ts` | Least-privilege workflow steps with approval gates |
| Gateway | `lib/core/ai/gateway.ts` | Provider abstraction (OpenAI-compatible / Anthropic / local / demo), budget + rate limit, usage logging |

Contract: the gateway is *narration only*. Test `tests/assistant-reporting.test.ts` asserts the
model cannot introduce an unknown player and that write intents do not execute.

## 5. Determinism

* `lib/core/rng.ts` (mulberry32) — every simulation takes a seed.
* `REFERENCE_DATE` fixes ages and workload windows (demo: `2027-04-01`).
* Report/auction/prediction runs record their seed so results can be replayed in a meeting.
* Flaky-looking numbers are therefore a bug, not noise.

## 6. Public vs private surface

| Surface | Gate | Indexing |
| --- | --- | --- |
| `/`, `/tour`, `/faq`, `/privacy`, `/testimonials`, `/contact` | none | indexable, in sitemap |
| `/login`, `/thank-you` | none | `noindex`, not in sitemap |
| `/dashboard`, `/data`, `/players`, … (20 routes) | middleware cookie check + server session validation | `noindex` meta + `X-Robots-Tag` header |
| `/api/**` | per-route `guard()` | `Disallow: /api/` in robots |
| Share cards (`…/opengraph-image`) | none (crawler-friendly) | draws only name/role/team/format; `PUBLIC_PLAYER_PREVIEWS=false` for real data |

## 7. Failure modes and degradation

| Failure | Behaviour |
| --- | --- |
| No AI key | Deterministic narration, labelled; all analytics unaffected |
| Analytics service down | Next.js computes in-process; admin banner shows the service is unreachable |
| Storage/DB unavailable | Write endpoints return typed errors; read endpoints keep serving the in-memory snapshot |
| Rate limit hit on public form | `429` + `Retry-After`; user copy keeps their draft |
| Missing sample-size baseline | Engines return `null` with an explanation instead of `0` |
| Middleware mis-detection of protocol | HTTPS redirect only when `ENFORCE_HTTPS=true`; localhost exempt |

## 8. Scaling notes

* Reads scale by caching the store snapshot in memory (`globalThis.__ucipStore`) — fine for a
  single organisation, replaced by Postgres + pooling in phase 3.
* Heavy compute moves to `backend/` (Render) in phase 4; the Next.js route becomes a thin
  proxy with a timeout and a local fallback.
* Public pages are statically prerenderable; workspace pages are `force-dynamic` and
  session-scoped.
* Rate limiting is per process today; a shared limiter (Redis/Upstash) is required for
  multi-instance deployments and is listed as an open item, not claimed.

## 9. Security architecture

See [`docs/security/SECURITY_PRACTICES.md`](docs/security/SECURITY_PRACTICES.md) and
`docs/SECURITY.md` in the application repo for the control-by-control table (RBAC matrix,
session lifecycle, audit trail, headers, form hardening, known gaps).
