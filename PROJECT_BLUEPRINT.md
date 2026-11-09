# Project Blueprint — build, operate and extend UCIP

This is the working plan: what exists, how it is layered, how work is sequenced, how quality
is gated, and what must be true before each phase is called done.

---

## 1. System at a glance

```
                    ┌──────────────────────────────────────────────┐
  Public visitors → │  Next.js 14 App Router (Vercel / Node 20)    │
  Analysts / staff→ │  app/(public) · app/(app) · app/api          │
                    │  lib/core/** deterministic engines           │
                    │  lib/core/db/store.ts → JSON or PostgreSQL   │
                    └───────────────┬──────────────────────────────┘
                                    │ optional
                    ┌───────────────▼──────────────┐   ┌────────────────────┐
                    │ FastAPI analytics service    │   │ Object storage     │
                    │ services/analytics (now)     │   │ uploads, exports   │
                    │ backend/        (phase 2)    │   │ (Supabase/S3)      │
                    └──────────────────────────────┘   └────────────────────┘
```

**Current phase (1) is the supported one:** one Next.js process is the frontend, the API and
the analytics engine; the Python service is optional compute. Phase 2 (scaffolded in this
package) splits the heavy Python surface onto Render and keeps Next.js on Vercel.

## 2. Layer rules (non-negotiable)

1. **UI never computes cricket numbers.** Pages call an API route; the route calls a
   `lib/core/**` engine; the engine returns typed results with provenance and caveats.
2. **The AI layer never computes.** `lib/core/ai/*` receives finished facts and writes prose.
   Any number in narration must exist in the evidence block.
3. **One data model.** `lib/core/types.ts` is the single domain model; uploaded and synthetic
   records are interchangeable.
4. **Persistence goes through the store façade.** `lib/core/db/store.ts` is the only place
   that touches disk/DB; swapping JSON → PostgreSQL must not touch feature code.
5. **Writes are permission-gated and audited.** `guard(permission)` at the route, audit entry
   at the mutation.
6. **Public pages never read workspace data.** `app/(public)/**` reads static content or the
   published-testimonials subset only.

## 3. Module inventory (what exists today)

| Layer | Location | Count |
| --- | --- | --- |
| Pages (public + private) | `app/(public)`, `app/(app)`, `app/login` | 29 |
| Route layouts with metadata | `app/**/layout.tsx` | 25 |
| API route handlers | `app/api/**/route.ts` | 44 |
| Domain/analytics engines | `lib/core/**` | 40 modules |
| Growth/SEO helpers | `lib/core/growth`, `lib/site.ts`, `lib/content` | 6 |
| UI components | `components/*.tsx` | 10 |
| Tests (TypeScript) | `tests/*.test.ts` | 10 files / 151 tests |
| Tests (Python) | `services/analytics/tests` | 11 tests |
| Migrations | `db/migrations/0001_init.sql` | 1 |
| Sample data | `sample-data/` | 6 files (all synthetic) |
| Docs | `docs/` | 8 files (+ the 24 added here) |

## 4. Work breakdown by workstream

| WS | Scope | Owner | Phase |
| --- | --- | --- | --- |
| WS-1 Data | ingestion, mapping, validation, merge, quality, approval | Data engineering | 1 (done) |
| WS-2 Player intelligence | metrics, risk, potential, trajectory, comparison | Analytics | 1 (done) |
| WS-3 Team & auction | squad, XI, valuation, auction sim, purse | Analytics + strategy | 1 (done) |
| WS-4 Match & conditions | pitch/venue, opposition, prediction, match-ups | Analytics | 1 (done) |
| WS-5 Narration & reporting | NLQ, assistant, agents, reports, exports | Full-stack + AI | 1 (done) |
| WS-6 Trust & growth | 404, SEO, OG, sitemap, forms, legal, FAQ, testimonials | Full-stack | 1 (done) |
| WS-7 Platform ops | auth, RBAC, audit, security posture, settings | Backend | 1 (done) |
| WS-8 Deployment | Docker, Vercel, Render, Postgres, storage, CI | DevOps | 2 (scaffolded) |
| WS-9 Split | frontend/ + backend/ monorepo extraction | Architecture | 2–3 (planned) |

## 5. Sequencing and gates

| Phase | Content | Exit gate |
| --- | --- | --- |
| 0 | Discovery, demo dataset, domain model | `lib/core/types.ts` covers all 30 features; seed generator deterministic |
| 1 | All 30 features + 14 website features (shipped) | 151 unit + 11 py + 58 smoke green; build clean; 20/20 workspace pages 200 |
| 2 | Deployment hardening (this package) | Docker/compose build; Vercel + Render configs validated; health checks; CORS allow-list; runbook written |
| 3 | Postgres + storage migration | Store façade backed by Postgres; parity tests; backup/restore rehearsed |
| 4 | Python service scale-out | `backend/` serves statistics/simulation under CORS; Next proxies; load test recorded |
| 5 | Monorepo split | `app/ lib/ components/` → `frontend/src/`; CI builds both; rollback tag |

## 6. Definition of done (per feature)

1. Typed end to end (strict TS / Python type hints), no `any` new introductions.
2. Loading, empty and error states rendered.
3. Evidence/provenance/caveat surfaced in the UI.
4. Test at the right level (unit for math, integration for API, smoke for wiring).
5. Docs updated (feature map + API reference if the surface changed).
6. Permission check present on every write; audit entry created.
7. No new dependency unless justified in an ADR.

## 7. Risk register

| Risk | Impact | Likelihood | Mitigation |
| --- | --- | --- | --- |
| Small-sample over-reading | Wrong selection call | High | Confidence shrinkage, sample sizes in UI, sensitivity report |
| JSON store growth beyond single-node comfort | Slow writes | Medium | Store façade + Postgres path (phase 3), audit caps |
| AI provider outage | No narration | Medium | Deterministic fallback always available and labelled |
| Prompt injection via uploads | Data exfiltration / bad actions | Medium | Untrusted-content treatment, write confirmations, injection guard |
| Per-process rate limiting | Bypass across instances | Medium | Documented; shared limiter (Redis) in phase 4 |
| Private data indexed | Compliance breach | Low | noindex meta + header + robots + auth gate; verified in smoke |
| Monorepo split breaking builds | Delivery halt | Medium | Phase-gated with reversible checklist and tag |

## 8. RR pilot specifics

* User team: Rajasthan Royals (`isUserTeam: true`), colours `#E8C15C`.
* Talent preset: uncapped, age ≤ 23, IPL 2027 brief, 10-player shortlist.
* Purse and squad rules encoded in `/auction` and `/team`; overseas cap in `/xi`.
* Deliverable per cycle: talent brief (PDF/DOCX), auction plan (XLSX), XI scenarios (PPTX).
* Reference date stays `2027-04-01` so ages and load windows are reproducible across runs.

## 9. Documentation obligations

Every phase must leave: updated `CHANGELOG.md`, an ADR for structural decisions, and an
updated `MIGRATION_MAP.md` row for anything that moved between layers.
