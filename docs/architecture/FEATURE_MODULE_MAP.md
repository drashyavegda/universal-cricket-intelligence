# Feature → module map (30 features)

All paths exist in the current repository. `API` lists the handlers the UI calls.

| # | Feature | Page | API | Engines | Tests |
| --- | --- | --- | --- | --- | --- |
| 1 | Upload & ingestion | `/data` | `POST /api/upload` | `data/parse`, `data/extract` | `data.test.ts` |
| 2 | Data intelligence (mapping) | `/data` | `GET /api/datasets` | `data/synonyms` | `data.test.ts` |
| 3 | Preview & correction | `/data` | `GET /api/datasets/[id]`, `PATCH /api/records/[id]` | `data/parse` | `data.test.ts`, `promote.test.ts` |
| 4 | Multi-file merge | `/data` | `POST /api/merge` | `data/merge` | `data.test.ts` |
| 5 | Performance intelligence | `/players/[id]` | `GET /api/players/[id]` | `players/metrics` | `stats.test.ts` |
| 6 | Talent discovery | `/talent` | `POST /api/talent` | `ranking/engine`, `ranking/presets`, `players/potential` | `ranking.test.ts` |
| 7 | Ranking & decision engine | `/players`, `/talent` | `POST /api/rank` | `ranking/*` | `ranking.test.ts` |
| 8 | Comparison | `/compare` | `POST /api/compare` | `players/metrics` | `stats.test.ts` |
| 9 | Statistical analysis | `/stats` | `POST /api/stats` | `stats/descriptive`, `stats/probability` | `stats.test.ts` |
| 10 | Squad intelligence | `/team` | `GET /api/team/[id]` | `team/squad` | `team-intel.test.ts` |
| 11 | Auction simulation | `/auction` | `POST /api/auction` | `auction/sim` | `valuation.test.ts` |
| 12 | Discovery & recommendations | `/scouting` | `POST /api/scouting` | `scouting/global` | `team-intel.test.ts` |
| 13 | Risk & reliability | `/players/[id]` | `GET /api/players/[id]` | `players/risk` | `team-intel.test.ts` |
| 14 | Dashboard | `/dashboard` | `GET /api/overview` | (aggregates) | smoke |
| 15 | Research & external intel | `/research` | `GET /api/knowledge` | `knowledge/search` | `assistant-reporting.test.ts` |
| 16 | Match & situational | `/match` | `/api/players/[id]`, fixtures | `sim/match` | `xi-sim.test.ts` |
| 17 | Pitch/venue/weather | `/pitch` | `POST /api/pitch` | `pitch/venue` | `team-intel.test.ts` |
| 18 | XI optimisation | `/xi` | `POST /api/xi` | `team/xi` | `xi-sim.test.ts` |
| 19 | Opposition scouting | `/opposition` | `POST /api/opposition` | `team/opposition` | `team-intel.test.ts` |
| 20 | Predictive / Monte Carlo | `/prediction` | `POST /api/predict` | `sim/match` | `xi-sim.test.ts` |
| 21 | Market intel & valuation | `/auction` | `GET /api/auction` | `auction/valuation` | `valuation.test.ts` |
| 22 | Career trajectory | `/players/[id]` | `GET /api/players/[id]` | `career/trajectory` | `team-intel.test.ts` |
| 23 | Reports & presentations | `/reports` | `/api/reports`, `…/export` | `reporting/build`, `reporting/export` | `assistant-reporting.test.ts`, smoke (6 formats) |
| 24 | Workload | `/workload` | `GET /api/workload` | `workload/engine` | `team-intel.test.ts` |
| 25 | Global scouting | `/scouting` | `POST /api/scouting` | `scouting/global` | `team-intel.test.ts` |
| 26 | Data quality | `/data` | `GET /api/datasets/[id]/quality` | `data/quality`, `data/promote` | `promote.test.ts` |
| 27 | NL analytics | `/assistant` | `POST /api/assistant` | `ai/nlq`, `ai/assistant` | `assistant-reporting.test.ts` |
| 28 | Agents & automation | `/automation` | `/api/workflows` | `ai/agents` | `assistant-reporting.test.ts` |
| 29 | Knowledge base | `/research` | `GET /api/knowledge` | `knowledge/search` | `assistant-reporting.test.ts` |
| 30 | Security & governance | `/settings` | `/api/auth/*`, `/api/audit`, `/api/settings/*` | `auth/*`, `security/posture` | `auth-security.test.ts` |

## Cross-cutting modules

| Concern | Module |
| --- | --- |
| Domain types | `lib/core/types.ts` |
| Persistence | `lib/core/db/{store,seed}.ts` |
| Randomness | `lib/core/rng.ts` |
| API helpers | `lib/api/helpers.ts` |
| Browser API | `lib/client/api.ts` |
| Analytics events | `lib/client/analytics.ts` |
| SEO registry | `lib/site.ts` |
| Growth/forms | `lib/core/growth/{forms,feedback,testimonials}.ts` |
| Edge security | `lib/core/security/edge.ts`, `middleware.ts` |
| UI primitives | `components/ui.tsx` |
| Charts | `components/charts.tsx` |
| Shell/nav | `components/shell.tsx`, `components/public-chrome.tsx`, `components/breadcrumbs.tsx` |

## Adding a feature — required touch points
1. Engine in `lib/core/<area>/` + unit test.
2. Route in `app/api/<area>/route.ts` with `guard()`.
3. Page in `app/(app)/<route>/` + `layout.tsx` metadata (`robots: noindex`).
4. Register private metadata in `lib/site.ts` (`PRIVATE_ROUTES`) — uniqueness test covers it.
5. Row in this table + `CHANGELOG.md`.
