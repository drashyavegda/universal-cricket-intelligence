# Universal AI Cricket Intelligence, Analytics, Scouting & Auction Strategy Platform

**Monorepo** — the Next.js application (`frontend/`), the optional FastAPI compute service
(`backend/`), the 30 analytics modules, the 14 website quality/SEO/trust features and the full
technical documentation set. Version `1.2.0`.

| Part | Where | Hosted on |
| --- | --- | --- |
| Public site + private workspace + 46 API route handlers | `frontend/` | **Vercel — Root Directory `frontend`** |
| FastAPI compute service (optional) | `backend/` | **Render** |
| Phase-1 Python statistics service (optional) | `services/analytics/` | anywhere |
| Documentation, database, security, marketing, legal | `docs/`, `database/`, `security/`, … | — |

> **The Vercel "Couldn't find any pages or app directory" error is fixed by this layout.**
> The Next.js app now lives in `frontend/` (real `app/`, `lib/`, `components/`, `middleware.ts`),
> and the Vercel project must have **Root Directory = `frontend`**. Full runbook:
> [`docs/deployment/VERCEL.md`](docs/deployment/VERCEL.md).

---

## 1. What is real

| Claim | Evidence |
| --- | --- |
| The workspace runs | 30 pages · 26 layouts · 46 API routes · production build 35 routes |
| The analytics are deterministic and tested | `npm run typecheck` clean · `npm test` **168 passed / 11 files** |
| The FastAPI service runs | `cd backend && pytest -q` **15 passed** |
| The public site is verified end-to-end | `npm run smoke` **58/58 checks** against a running production build |
| Nothing is fabricated | Demo data is synthetic and labelled `DEMO`; unknown values render `—`, never `0` |

Path-by-path mapping of every folder: [`MIGRATION_MAP.md`](MIGRATION_MAP.md) and the
machine-readable [`PROJECT_STRUCTURE.json`](PROJECT_STRUCTURE.json).

---

## 2. Quick start

```bash
cd frontend
npm install                      # frontend/ is the only npm workspace
npm run seed                     # deterministic demo: 190 synthetic players, 10 teams, 12 venues
npm run dev                      # http://localhost:3000  → public site · /login → workspace
```

Optional FastAPI service (the app works without it):

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000      # /health · /docs
```

Then point the frontend at it — `frontend/.env.local`:

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Restart `npm run dev`, open the workspace, and check **Service Status** in the sidebar
(`/system`) — it reports whether the Python service is reachable and which engine answered.

Demo accounts (local evaluation only):

| Email | Password | Role |
| --- | --- | --- |
| `owner@demo.local` | `Demo#12345` | owner — everything, including dataset approval |
| `analyst@demo.local` | `Analyst#12345` | analyst — upload, edit, analyse, report |
| `scout@demo.local` | `Scout#12345` | scout — analyses, shortlists, reports |
| `viewer@demo.local` | `Viewer#12345` | viewer — read-only |

---

## 3. Verify it yourself

```bash
cd frontend
npm run typecheck                    # 0 errors (strict)
npm test                             # 168 passed, 11 files
npm run build                        # 35 routes + middleware
npm run seed && npm start &          # production build on :3000
npm run smoke                        # 58/58 checks
cd ../backend && python -m pytest -q # 15 passed
```

---

## 4. Deployment in one screen

| Target | Root directory | Build | Start / output | Health check |
| --- | --- | --- | --- | --- |
| **Vercel** (Next.js) | `frontend` | `npm run build` | `.next` (automatic) | `/api/health` |
| **Render** (FastAPI) | `backend` | `pip install -r requirements.txt` | `uvicorn main:app --host 0.0.0.0 --port $PORT` | `/health` |
| Docker (local/self-host) | repo root | — | `docker compose up --build` | `/api/health` |

Vercel environment variables: `NEXT_PUBLIC_SITE_URL` (required), `NEXT_PUBLIC_API_URL`
(Render URL — connects the compute service), `REFERENCE_DATE`, `DEMO_MODE`, `DATA_DIR`,
optionally `ANALYTICS_SERVICE_TOKEN` (must match Render), `NEXT_PUBLIC_GA_MEASUREMENT_ID`,
the Turnstile pair, `AI_API_KEY`, `DATABASE_URL` + `DB_ADAPTER=postgres`.
Never put a secret in a `NEXT_PUBLIC_*` variable.

---

## 5. The Rajasthan Royals 2027 scouting workspace

The workspace ships with **Rajasthan Royals configured as the user team** (`isUserTeam: true`
in `lib/core/db/seed.ts`, colours `#E8C15C`), and the talent module carries the
*IPL 2027 — uncapped domestic brief* preset used by the SupeRR Selector Season 2 brief:

* `/talent` — age-banded, uncapped-eligible discovery with headroom weighting and a
  sensitivity report.
* `/auction` — purse position, bid ceilings by role, seeded virtual auction room.
* `/xi` — constraint-satisfying XI (overseas limit, keeper, 20-over bowling plan).
* `/reports` — the `talent` builder produces the 10-player shortlist with policy caveats.

Player names, ages and statistics in demo mode are **synthetic** and labelled `DEMO`
everywhere. Real data must be uploaded and approved in `/data`. See
[`docs/user-guides/RR_SCOUTING_WORKSPACE.md`](docs/user-guides/RR_SCOUTING_WORKSPACE.md).

---

## 6. The 30 platform features and where they live

All 30 are implemented. Route/API paths are the real ones in the current application;
feature-level documentation lives in [`docs/architecture/FEATURE_MODULE_MAP.md`](docs/architecture/FEATURE_MODULE_MAP.md)
and [`docs/requirements/FEATURE_REQUIREMENTS_30.md`](docs/requirements/FEATURE_REQUIREMENTS_30.md).

| # | Feature | UI route | API | Core module | Status |
| --- | --- | --- | --- | --- | --- |
| 1 | Universal data upload & ingestion | `/data` | `POST /api/upload` | `lib/core/data/parse.ts`, `extract.ts` | EXISTS |
| 2 | Universal cricket data intelligence | `/data` | `GET /api/datasets` | `lib/core/data/synonyms.ts` | EXISTS |
| 3 | Data preview & correction | `/data` | `GET/PATCH /api/records/[id]` | `lib/core/data/parse.ts` | EXISTS |
| 4 | Multi-file upload & intelligent merging | `/data` | `POST /api/merge` | `lib/core/data/merge.ts` | EXISTS |
| 5 | Cricket performance intelligence | `/players/[id]` | `GET /api/players/[id]` | `lib/core/players/metrics.ts` | EXISTS |
| 6 | Young talent discovery | `/talent` | `POST /api/talent` | `lib/core/ranking/engine.ts` | EXISTS |
| 7 | Player ranking & decision engine | `/players` | `POST /api/rank` | `lib/core/ranking/*` | EXISTS |
| 8 | Player comparison | `/compare` | `POST /api/compare` | `lib/core/players/metrics.ts` | EXISTS |
| 9 | Statistical performance & consistency | `/stats` | `POST /api/stats` | `lib/core/stats/descriptive.ts` | EXISTS |
| 10 | Team & squad intelligence | `/team` | `GET /api/team/[id]` | `lib/core/team/squad.ts` | EXISTS |
| 11 | Auction simulation | `/auction` | `POST /api/auction` | `lib/core/auction/sim.ts` | EXISTS |
| 12 | Player discovery & recommendations | `/scouting` | `POST /api/scouting` | `lib/core/scouting/global.ts` | EXISTS |
| 13 | Player risk & reliability | `/players/[id]` | `GET /api/players/[id]` | `lib/core/players/risk.ts` | EXISTS |
| 14 | Visualization & intelligence dashboard | `/dashboard` | `GET /api/overview` | `components/charts.tsx` | EXISTS |
| 15 | Cricket research & external intelligence | `/research` | `GET /api/knowledge` | `lib/core/knowledge/search.ts` | EXISTS |
| 16 | Match & situational analysis | `/match` | `GET /api/players` (events) | `lib/core/sim/match.ts` | EXISTS |
| 17 | Pitch, venue & weather intelligence | `/pitch` | `POST /api/pitch` | `lib/core/pitch/venue.ts` | EXISTS |
| 18 | Playing XI & combination optimization | `/xi` | `POST /api/xi` | `lib/core/team/xi.ts` | EXISTS |
| 19 | Opposition scouting | `/opposition` | `POST /api/opposition` | `lib/core/team/opposition.ts` | EXISTS |
| 20 | Predictive analytics & Monte Carlo | `/prediction` | `POST /api/predict` | `lib/core/sim/match.ts` | EXISTS |
| 21 | Auction market intelligence & valuation | `/auction` | `GET /api/auction` | `lib/core/auction/valuation.ts` | EXISTS |
| 22 | Career trajectory & development | `/players/[id]` | `GET /api/players/[id]` | `lib/core/career/trajectory.ts` | EXISTS |
| 23 | Automated reports & presentations | `/reports` | `POST /api/reports`, `…/export` | `lib/core/reporting/*` | EXISTS |
| 24 | Workload & player management | `/workload` | `GET /api/workload` | `lib/core/workload/engine.ts` | EXISTS |
| 25 | Global cricket talent scouting | `/scouting` | `POST /api/scouting` | `lib/core/scouting/global.ts` | EXISTS |
| 26 | Data quality & verification | `/data` (Quality tab) | `GET /api/datasets/[id]/quality` | `lib/core/data/quality.ts` | EXISTS |
| 27 | Natural language analytics | `/assistant` | `POST /api/assistant` | `lib/core/ai/{nlq,assistant}.ts` | EXISTS |
| 28 | AI agents & workflow automation | `/automation` | `GET/POST /api/workflows` | `lib/core/ai/agents.ts` | EXISTS |
| 29 | Knowledge base & research library | `/research` | `GET /api/knowledge` | `lib/core/knowledge/search.ts` | EXISTS |
| 30 | Security, privacy & governance | `/settings` | `/api/auth/*`, `/api/audit` | `lib/core/auth/*`, `lib/core/security/*` | EXISTS |

AI narration (features 27–28) additionally needs a provider key; without one the
deterministic fallback is used and labelled as such. The maths never depends on the model.

---

## 7. The 14 website quality, SEO, trust & growth features

Implemented inside the same application (not a disconnected marketing site). Detail:
[`docs/architecture/WEBSITE_QUALITY_MODULE.md`](docs/architecture/WEBSITE_QUALITY_MODULE.md),
[`marketing-seo/`](marketing-seo/) and [`legal/`](legal/).

| # | Feature | Implementation | Status |
| --- | --- | --- | --- |
| 1 | Custom 404 | `app/not-found.tsx` | EXISTS |
| 2 | Separate page titles | `lib/site.ts` registry + per-route `layout.tsx` | EXISTS |
| 3 | Meta descriptions | `lib/site.ts` (`PUBLIC_PAGES`, `PRIVATE_ROUTES`) | EXISTS |
| 4 | Open Graph / social images | `app/opengraph-image.tsx`, `app/(app)/players/[id]/opengraph-image.tsx` | EXISTS |
| 5 | Internal linking & breadcrumbs | `components/breadcrumbs.tsx`, related-analysis block | EXISTS |
| 6 | XML sitemap | `app/sitemap.ts` (public pages only) | EXISTS |
| 7 | robots.txt | `app/robots.ts` (disallows every private route) | EXISTS |
| 8 | HTTPS & secure connections | `middleware.ts`, `lib/core/security/edge.ts`, `vercel.json`, `render.yaml` | EXISTS (edge TLS = provider setting) |
| 9 | Spam protection | `lib/core/growth/forms.ts` + `feedback.ts` | EXISTS (CAPTCHA needs your Turnstile keys) |
| 10 | Thank-you pages | `app/(public)/thank-you/page.tsx` (3 states) | EXISTS |
| 11 | Google Analytics 4 | `lib/client/analytics.ts`, `components/analytics.tsx` | EXISTS (needs measurement ID) |
| 12 | Privacy policy | `app/(public)/privacy/page.tsx` | EXISTS |
| 13 | Searchable FAQ | `lib/content/faq.ts`, `components/faq-explorer.tsx` | EXISTS |
| 14 | Testimonials management | `lib/core/growth/testimonials.ts`, `components/growth-admin.tsx` | EXISTS (real quotes still needed) |

---

## 8. Repository layout in this package

```
Universal-Cricket-Intelligence-Platform/
├── README.md PRD.md PROJECT_BLUEPRINT.md ARCHITECTURE.md ROADMAP.md
├── CHANGELOG.md CONTRIBUTING.md LICENSE MIGRATION_MAP.md FILES_TO_IMPLEMENT.md
├── PROJECT_STRUCTURE.json  .env.example  .gitignore  package.json (workspaces)
├── vercel root config       → NONE by design: Vercel reads frontend/vercel.json
├── frontend/               ← the Next.js application (Vercel Root Directory)
│   ├── app/                30 pages · 26 layouts · 46 API route handlers
│   ├── components/         10 UI components (shell, charts, ui, forms, service-status)
│   ├── lib/                api/ · client/ · content/ · site.ts · core/ (40 modules)
│   ├── public/  types/  tests/  sample-data/  scripts/{seed.ts,smoke.mjs}
│   ├── src/                layer map, feature specs, asset folders, typed starters
│   └── package.json  next.config.mjs  tsconfig.json  tailwind.config.ts  vercel.json
├── backend/                FastAPI service (Render): core · api · services · schemas · tests
├── services/analytics/     phase-1 Python statistics service (optional)
├── docs/                   requirements · architecture · api · database · deployment ·
│                           security · testing · user-guides · decisions · app-reference
├── database/  infrastructure/  security/  analytics/  data/  reports/
└── marketing-seo/  legal/  scripts/  tests/  .github/workflows/
```

**`frontend/` is now the real application.** The phase-5 move has been executed: `app/`,
`components/`, `lib/`, `public/`, `types/`, `tests/`, `sample-data/`, `middleware.ts`,
`next.config.mjs`, `tsconfig.json`, `tailwind.config.ts`, `vitest.config.ts` and the app's own
`package.json` + `package-lock.json` live there. Vercel builds exactly that directory.

`frontend/src/` is documentation and scaffolding that the move left behind on purpose:
the layer map (`src/app/README.md`), the component taxonomy, the 16 feature folders with
scope + acceptance criteria, the public-asset folders, and small typed starters
(`config/routes.ts`, `constants/navigation.ts`, `utils/format.ts`). They are *maps and
helpers*, not a second copy of any page.

`backend/` is the deployable FastAPI expansion of the two-file phase-1 service: settings,
structured logging, env-driven CORS allow-list, request ids, error envelope, health/ready/version/
metrics, six statistics endpoints, a worker skeleton, and 15 passing tests.

---

## 9. Where everything is documented

| Question | Document |
| --- | --- |
| What is the product and why? | [`PRD.md`](PRD.md) |
| How do I build it, phase by phase? | [`PROJECT_BLUEPRINT.md`](PROJECT_BLUEPRINT.md), [`ROADMAP.md`](ROADMAP.md) |
| How is it wired internally? | [`ARCHITECTURE.md`](ARCHITECTURE.md), [`docs/architecture/`](docs/architecture/) |
| Which endpoints exist? | [`docs/api/API_REFERENCE.md`](docs/api/API_REFERENCE.md) |
| Which tables/entities? | [`docs/database/SCHEMA_REFERENCE.md`](docs/database/SCHEMA_REFERENCE.md) |
| How do I deploy to Vercel + Render + Supabase? | [`docs/deployment/VERCEL.md`](docs/deployment/VERCEL.md), [`docs/deployment/RENDER.md`](docs/deployment/RENDER.md), [`docs/deployment/SUPABASE.md`](docs/deployment/SUPABASE.md), [`docs/deployment/TROUBLESHOOTING.md`](docs/deployment/TROUBLESHOOTING.md) |
| Which env vars, and which are secrets? | [`docs/deployment/ENVIRONMENT_VARIABLES.md`](docs/deployment/ENVIRONMENT_VARIABLES.md) |
| Security posture and known gaps | [`docs/security/SECURITY_PRACTICES.md`](docs/security/SECURITY_PRACTICES.md) |
| How is it tested? | [`docs/testing/TEST_STRATEGY.md`](docs/testing/TEST_STRATEGY.md) |
| How do I contribute? | [`CONTRIBUTING.md`](CONTRIBUTING.md) |
| Why was a decision made? | [`docs/decisions/`](docs/decisions/) (ADRs 0001–0008) |

---

## 10. Honest limitations

* Demo data is synthetic and labelled `DEMO`. Uploaded data is labelled `UPLOADED`; model
  output is labelled `MODEL`. No official league feed is bundled.
* AI narration needs your own provider key; deterministic fallback otherwise.
* Spam CAPTCHA needs your Cloudflare Turnstile keys; rate-limit + honeypot are always on.
* Analytics needs a GA4 measurement ID, and only loads after consent.
* Testimonials ship as three labelled *sample* rows — never as real endorsements.
* Edge TLS/HSTS termination, backups and search-console verification are hosting settings,
  documented but not something an application can do for you.
* `backend/` and the `frontend/src/**` taxonomy are scaffolding: they compile and are
  documented, but the running application does not depend on them yet.

See [`FILES_TO_IMPLEMENT.md`](FILES_TO_IMPLEMENT.md) for the exact remaining work.
