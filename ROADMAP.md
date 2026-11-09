# Roadmap

Priority key: **P0** = blocker for pilot use · **P1** = needed for production · **P2** =
valuable, not urgent. Status mirrors what has actually been executed.

## Phase 0 — Foundation  ·  complete
| Item | Status | Evidence |
| --- | --- | --- |
| Domain model covering all 30 features | Done | `lib/core/types.ts` |
| Deterministic demo dataset (190 players, 10 teams, 12 venues, fixtures) | Done | `scripts/seed.ts` |
| Store facade (JSON) | Done | `lib/core/db/store.ts` |

## Phase 1 — All 30 features + 14 website-quality features  ·  complete
| Item | P | Status |
| --- | --- | --- |
| Data ingestion, mapping, validation, merge, quality, approval | P0 | Done — `/data`, `lib/core/data/*` |
| Player intelligence, risk, comparison, ranking, talent discovery | P0 | Done — `/players`, `/compare`, `/talent`, `/rank` |
| Team, XI, auction valuation + seeded auction room, purse | P0 | Done — `/team`, `/xi`, `/auction` |
| Pitch/venue, opposition, prediction, match-ups | P0 | Done — `/pitch`, `/opposition`, `/prediction`, `/match` |
| Workload, scouting missions, career trajectory | P1 | Done — `/workload`, `/scouting`, player page |
| Reports + 6 export formats | P0 | Done — `/reports`, `lib/core/reporting/*` |
| Assistant, agents, knowledge base | P1 | Done (+ key for live narration) |
| Auth, RBAC, audit, 2FA, security posture | P0 | Done — `/settings`, `lib/core/auth/*` |
| 404, titles, meta, OG images, sitemap, robots, breadcrumbs | P1 | Done |
| Public forms + spam protection + thank-you | P1 | Done (CAPTCHA key optional) |
| Privacy policy, FAQ, testimonials (labelled samples) | P1 | Done |
| GA4 (consent-gated, optional) | P2 | Done (needs measurement ID) |
| Test suite: 168 unit · 15 py · 58 smoke | P0 | Done |

## Phase 1.1 — Structure & deployment package  ·  this archive
| Item | P | Status |
| --- | --- | --- |
| Full documentation set (PRD, blueprint, ADRs, guides) | P1 | Done |
| Folder architecture mapped to real modules | P1 | Done |
| Vercel / Render / Supabase / storage templates | P1 | Done (configs); deployment itself needs your accounts |
| CORS, health, logging, error envelope in `backend/` | P1 | Scaffolded — compiles, not yet deployed |
| CI workflows (typecheck, tests, secret scan, build) | P1 | Done (need repo to run) |
| Legal drafts (terms, cookies, disclaimers) | P1 | Draft — needs legal review |

## Phase 2 — Deployment hardening  ·  next
| Item | P | Notes |
| --- | --- | --- |
| Build & smoke test inside Docker images | P0 | `docker compose up --build` then `scripts/testing/run-all.sh` |
| Render service live with `/health` | P0 | Set env vars per `docs/deployment/ENVIRONMENT_VARIABLES.md` |
| Production domain + `NEXT_PUBLIC_SITE_URL` + search console | P0 | Post-deploy checklist in `docs/deployment/VERCEL.md` |
| Real testimonials or remove samples | P1 | Owner-only admin panel |
| GA4 property + Turnstile keys | P2 | Optional, documented |

## Phase 3 — PostgreSQL + object storage  ·  planned
| Item | P | Notes |
| --- | --- | --- |
| Store facade backed by Postgres | P0 | `db/migrations/0001_init.sql` exists with RLS; parity tests required |
| Uploads/reports to Supabase Storage | P1 | Signed URLs; no public bucket |
| Backup/restore rehearsal | P0 | `scripts/maintenance/backup.sh` |
| Remove JSON store from production path | P1 | Keep for local dev only |

## Phase 4 — Python scale-out  ·  planned
| Item | P | Notes |
| --- | --- | --- |
| `backend/` served on Render with CORS allow-list | P1 | Next proxies with timeout + local fallback |
| Statistics/simulation offload | P1 | Parity tests: identical outputs to `lib/core/**` |
| Background worker for report generation | P2 | Job log in DB; visible in the UI |
| Shared rate limiter (Redis/Upstash) | P1 | Needed for multi-instance |

## Phase 5 — Monorepo split  ·  planned, reversible
| Item | P | Notes |
| --- | --- | --- |
| Move `app/ lib/ components/` → `frontend/src/` | P1 | Checklist in `MIGRATION_MAP.md`; keep a rollback tag |
| Split route handlers into `backend/` where they do heavy compute | P2 | Only after phase 4 parity |
| CI builds and tests both packages | P1 | `.github/workflows/ci.yml` already shaped for this |

## Explicitly out of scope (unchanged)
Live scoring feed · betting/gambling surfaces · medical diagnosis · payments · official league
data redistribution · OCR for scanned PDFs.
