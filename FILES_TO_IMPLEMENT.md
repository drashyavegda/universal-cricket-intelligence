# Files to implement

What remains between this structure package and a fully monorepo, feature-complete product.
Grouped by phase; each item says **what**, **where**, and **how you know it is done**.

Scope note: the 30 analytics features and the 14 website-quality features are **already implemented**
and tested in the running application (168 vitest, 15 pytest, 58 smoke checks, production build). This
file lists the structural work this package prepares, not the product itself.

---

## Phase 1 — adopt the structure (no behaviour change)

| # | File / folder | Work | Done when |
| --- | --- | --- | --- |
| 1.1 | `frontend/src/config/routes.ts`, `frontend/src/constants/navigation.ts` | Move the `NAV` array out of `components/shell.tsx` and use the typed model | sidebar renders identically; typecheck green |
| 1.2 | `frontend/src/utils/format.ts` | Replace the inline `nf`/`pct` helpers in pages with the shared ones where they are duplicated | no duplicated formatters remain |
| 1.3 | `frontend/src/config/site.config.ts` | Optional; only adopt if a component needs it — `lib/site.ts` stays the source of truth | no new copy of the URL/title template |
| 1.4 | `frontend/public/manifest.json` | Add `<link rel="manifest">` in `app/layout.tsx` | install prompt appears; no 404s |
| 1.5 | `docs/` and `security/` | Keep as written; link `docs/README.md` from the root README | reviewer can navigate from the README alone |

## Phase 2 — make the service real (optional but designed)

| # | File | Work | Done when |
| --- | --- | --- | --- |
| 2.1 | `backend/**` | Deploy to Render as a second service | `/health` 200, `/stats/describe` returns the same numbers as `lib/core/stats/descriptive.ts` for 20 fixed fixtures |
| 2.2 | `lib/api/analytics-client.ts` (new, in the app) | BFF wrapper with 2 s timeout + local fallback | killing the service changes nothing user-visible |
| 2.3 | `tests/parity.test.ts` (new) | Parity test between TS and Python statistics | both suites fail if they diverge |
| 2.4 | `backend/database/session.py` | Only if the service needs reads | repository queries covered by indexes |

## Phase 3 — PostgreSQL

| # | File | Work | Done when |
| --- | --- | --- | --- |
| 3.1 | `lib/core/db/postgres.ts` | Implement the store façade against Postgres | `DB_ADAPTER=postgres npm test` green with a real DB |
| 3.2 | `database/migrations/0002_rls.sql` | RLS policies per organisation | a second org cannot read the first org's rows (test) |
| 3.3 | `lib/core/db/migrate.ts` | Runner that applies migrations in order, idempotently | fresh DB reaches the same state as a migrated one |
| 3.4 | `scripts/maintenance/restore-drill.sh` | Automated drill against a scratch DB | runs weekly in CI against an ephemeral Postgres |

## Phase 4 — operations hardening (the honest gaps)

| # | Item | Reference | Done when |
| --- | --- | --- | --- |
| 4.1 | Global rate limiter in `middleware.ts` + shared counter store | `security/RATE_LIMITING.md` | 429 envelope under load from two instances |
| 4.2 | Content-Security-Policy (nonce-based) | `docs/security/KNOWN_GAPS.md` | no `unsafe-inline`; app still renders |
| 4.3 | Real job queue for reports | `backend/tasks/report_jobs.py` | worker processes a job end to end with retries |
| 4.4 | Playwright for the 7 flows | `tests/e2e/README.md` | runs in CI on one browser |
| 4.5 | Open-redirect fix on `/login?next=` | `docs/security/KNOWN_GAPS.md` | only same-origin relative paths accepted |

## Phase 5 — the frontend/ split ✅ DONE (2026-11-09)

| # | Step | Status |
| --- | --- | --- |
| 5.1 | Move `app/ lib/ components/ public/ types/ tests/` into `frontend/` | **DONE** — typecheck, 168 tests, build (35 routes) and 58 smoke checks all green |
| 5.2 | Update `tsconfig` paths, `vitest.config.ts`, `/Dockerfile` COPY lines, `docker-compose.yml` context | **DONE** — paths stay `@/*`; Docker/compose build from `frontend/` |
| 5.3 | Point Vercel at `frontend` | **DONE in code** — set **Root Directory = `frontend`** in the Vercel dashboard (documented in `docs/deployment/VERCEL.md`) |
| 5.4 | Move feature *components* into `frontend/src/features/*` | **NOT DONE** (optional) — `src/features/` holds specs today; moving components there is cosmetic and can break imports |
| 5.5 | Wire the FastAPI service into the UI | **DONE** — `NEXT_PUBLIC_API_URL`, `/api/service/status`, `/api/service/describe`, `/system`, dashboard card |
| 5.6 | Parity test TS ↔ Python statistics | **NOT DONE** — needed before FastAPI becomes the default engine for any number the UI shows |

## Phase 6 — product gaps (explicitly not built)

| Item | Why it is not built | Needs |
| --- | --- | --- |
| OCR for scanned PDFs | needs a heavy native dependency; text-layer PDFs work today | a paid or self-hosted OCR service |
| Live match feed / in-play probabilities | no free, licensed feed exists | a data licence |
| Rival bid modelling from history | no historical auction logs | uploaded auction data |
| GPS / training-load import | health data ⇒ special-category processing | consent + DPIA + storage |
| Multi-organisation tenancy | single workspace today | RLS policies + org model |

## Anti-checklist — things deliberately *not* to do

* Do not copy `app/`, `lib/` or `components/` into `frontend/src/` before phase 5 is scheduled.
* Do not add `public/robots.txt` or `public/sitemap.xml` — both are generated.
* Do not overwrite the root `package.json`, `vercel.json`, `render.yaml`, `Dockerfile`,
  `docker-compose.yml`, `.env.example` with the templates in `infrastructure/`.
* Do not set `allow_origins=["*"]` in any Python service.
* Do not put a secret in a `NEXT_PUBLIC_` variable.
* Do not describe a PLANNED item as delivered in the README, the tour page or a report.
