# Architecture overview

## 1. Context

Actors: public visitor, analyst, owner/coach, viewer, background worker (phase 4), external AI
provider (optional), object storage (optional), PostgreSQL (optional in phase 1, required phase 3+).

## 2. Components (phase 1, shipped)

| Component | Technology | Responsibility | Failure isolation |
| --- | --- | --- | --- |
| Web app | Next.js 14 App Router | routes, RSC metadata, static public pages | n/a |
| BFF / API | 46 route handlers | validate → guard → engine → response envelope | per-route try/catch + `serverError()` |
| Domain engines | `lib/core/**` (40 modules) | deterministic analytics | pure functions, no I/O |
| Store | `lib/core/db/store.ts` | persistence (JSON today) | write errors logged, reads served from memory |
| Auth | `lib/core/auth/*` | sessions, RBAC, 2FA, audit | lockouts, expired sessions rejected |
| Optional compute | `services/analytics` FastAPI | heavy statistics | if down, Next computes locally |
| Edge middleware | `middleware.ts` | session gate, HTTPS/canonical, headers | missing config = no redirect (fail open on transport only) |

## 3. Request lifecycle (workspace read)

```
Browser → middleware (cookie present? else 307 /login)
        → app/(app)/layout.tsx  (sessionUser(token) → else redirect)
        → page (client) fetch('/api/…', credentials same-origin)
        → route handler: context() → guard('view') → engine()
        → json({...})  ── typed errors: {error, code}
        → page renders data | loading | empty | error state
```

## 4. Request lifecycle (public form write)

```
ContactForm (client)
  → POST /api/public/feedback  (no auth by design)
  → rateLimit → honeypot → timing → captcha(optional) → validate+sanitise → duplicate check
  → store.insert(feedback) + audit + notification
  → 201 {ok, reference}
  → router.push('/thank-you?ref=…')   ← only on ok && reference
```

## 5. Module boundaries

```
app/          HTTP + presentation only (no maths, no DB writes outside the store façade)
lib/core/     domain: pure where possible, typed, unit-tested
lib/api/      helpers: guard, json, fail, readBody, serverError, SESSION_COOKIE
lib/client/   browser-side: fetch wrapper, analytics façade
components/   UI primitives + composite widgets (no data fetching of their own except charts)
tests/        unit/integration for lib/core and helpers
scripts/      seed + smoke (CLI)
```

## 6. Data model summary

`Player`, `Team`, `Match` (+`MatchPerf`, ball `events`), `Venue`, `WeatherObservation`,
`Dataset` → `DatasetRecord`, `SavedReport`, `Shortlist`, `KnowledgeDoc`, `WorkflowRun`,
`Notification`, `User`, `Session`, `AuditEntry`, `AiUsageEntry`, `PlatformSettings`,
`Testimonial`, `FeedbackSubmission`. Full reference:
[`../database/SCHEMA_REFERENCE.md`](../database/SCHEMA_REFERENCE.md).

## 7. Non-functional behaviour

| Aspect | Approach |
| --- | --- |
| Determinism | `lib/core/rng.ts` + explicit seeds + fixed `REFERENCE_DATE` |
| Performance | in-memory snapshot of the store; percentile computations are O(n log n) on ≤ a few thousand players |
| Observability | `console` structured logs in routes; audit trail in store; AI usage with cost |
| Accessibility | semantic headings, labelled inputs, keyboard-operable accordions/tabs |
| Localisation | EN UI; assistant parses EN/HI/GU phrasing |

## 8. Phase-2 additions (scaffolded, not live)

`backend/` FastAPI service with config/logging/CORS/health/routers; Render hosting; Supabase
Postgres + Storage; background worker for report generation; shared rate limiter. The Next app
degrades gracefully to local compute when the service is absent.

## 9. What is explicitly *not* in the architecture

* No microservice mesh: two deployables maximum, one optional.
* No client-side state library: pages fetch their own data; nothing global to desynchronise.
* No direct browser → database access: everything passes through a route handler.
* No third-party analytics or CDN dependency required at runtime.
