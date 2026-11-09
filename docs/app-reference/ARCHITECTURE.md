# Architecture

## Shape of the system

```
┌─────────────────────────────── browser (React 18 client components) ───────────────────────────────┐
│  app/(app)/*  — 22 screens   ·   recharts charts   ·   fetch wrappers in lib/client/api.ts          │
└───────────────────────────────────────────┬─────────────────────────────────────────────────────────┘
                                            │ JSON over HTTP, session cookie (httpOnly, 12h)
┌───────────────────────────────────────────▼─────────────────────────────────────────────────────────┐
│ Next.js 14 route handlers  app/api/**/route.ts                                                       │
│   guard(permission) → RBAC  ·  zod-free explicit parsing  ·  audit()  ·  notify()                    │
└───────────────────────────────────────────┬─────────────────────────────────────────────────────────┘
                                            │ pure function calls (no hidden globals)
┌───────────────────────────────────────────▼─────────────────────────────────────────────────────────┐
│ lib/core/**  — the deterministic engine                                                              │
│  data: parse → synonyms → extract → quality → merge → promote                                        │
│  players: metrics → potential → risk → career trajectory → workload                                  │
│  ranking: presets → engine (percentiles, coverage, reliability, sensitivity)                         │
│  team: squad → xi (constrained search) → opposition                                                  │
│  auction: valuation → sim (seeded)      pitch: venue (evidence-tagged)                               │
│  sim: match (per-ball Monte Carlo)      stats: descriptive + probability                             │
│  ai: gateway (provider-agnostic) → nlq (rule parser) → assistant → agents                            │
│  reporting: build (quality gate) → export (md/html/pdf/docx/xlsx/pptx)                              │
│  auth: crypto (scrypt, TOTP, AES-GCM) · service (RBAC, sessions, rate limit)                        │
│  knowledge: search (BM25-lite)          security: posture (controls + threat sim)                     │
└───────────────────────────────────────────┬─────────────────────────────────────────────────────────┘
                                            │
              ┌─────────────────────────────┴──────────────────────────────┐
              │                                                            │
   ┌──────────▼───────────┐                              ┌─────────────────▼─────────────────┐
   │ JSON workspace store │  (default)                   │ PostgreSQL 14+  (production)      │
   │ lib/core/db/store.ts │                              │ db/migrations/0001_init.sql + RLS  │
   │ .data/store.json     │                              └───────────────────────────────────┘
   └──────────────────────┘
              │
   ┌──────────▼──────────────────────────┐        ┌────────────────────────────────────────┐
   │ optional Python analytics service   │        │ optional LLM provider (any OpenAI-     │
   │ services/analytics (FastAPI+numpy)  │        │ compatible endpoint, or none at all)   │
   └─────────────────────────────────────┘        └────────────────────────────────────────┘
```

## Three rules that shaped every file

1. **Deterministic maths, optional AI.** Every number is produced by TypeScript/numpy code with a
   stated formula. `aiCall()` receives the finished numbers and may only rephrase them. If no key
   is configured it returns a deterministic template labelled `demo`. Nothing in
   `lib/core/{stats,ranking,auction,team,sim,workload,career}` imports the AI gateway.
2. **Missing data is `null`, never a zero.** Rates guard their denominators
   (`balls > 0 ? runs/balls*100 : null`). Percentiles exclude nulls. Rankings rescale by metric
   coverage so a player with one great metric cannot outrank a complete record by accident.
   Every UI surface that shows a number can also show “—”.
3. **Provenance and labels travel with the data.** Each promoted player keeps a `sources[]` entry
   pointing at a dataset row. Synthetic records carry `synthetic: true` and render as `DEMO`.
   Pitch signals are tagged `historical | observation | forecast | inference`. Uncertainty is
   printed next to the estimate, not hidden in a footnote.

## Request lifecycle (example: talent shortlist)

```
POST /api/talent {maxAge:23,size:10}
  guard('analysis:run')            → 401/403 or { user, role }
  readBody<…>()                    → typed payload
  rankPlayers(store.players, …)    → buildCohort → percentiles → weighted score → ranked rows
  assessPotential(row)             → age/headroom/potential bands
  valuatePlayer({player, cohort,…})→ fair value + ceilings (scouting context)
  json({ rows, counts, sensitivity, assumptions, rrWorkspace })
```

Every route is stateless apart from the workspace store; the store is the only mutable object and
`update()` is the only writer, so a request either persists fully or not at all.

## Module contracts worth knowing

| Module | Contract |
| --- | --- |
| `rankPlayers` | Deterministic for identical inputs. Percentiles recomputed inside the filtered cohort. Filters with `requireAge` drop unknown-age players rather than guessing. |
| `optimiseXI` | Returns 11 players or fewer **only** if the pool cannot fill a side; every constraint is reported with a pass/fail and a detail string. Local optimum by construction. |
| `simulateMatch` | Seed in ⇒ identical distribution out. Returns `simulationError` (standard error of the win probability) so the UI can print ±. |
| `valuatePlayer` | Fair value and max-bid ceilings are separate numbers with separate reasoning; caveats always non-empty. |
| `aiCall` | Never throws on a provider failure: returns `mode: 'demo'` with the deterministic fallback text and a `note`. |
| `promoteDataset` | Only `approved` records reach the analytical store; idempotent by normalised name; skips rows without a name or without any figure. |
| `finalise(report)` | Attaches quality checks, issues and a de-duplicated source list before the report can be saved or exported. |

## Front-end architecture

- Server components for layout/shell; client components for interactive analytics.
- `useApi<T>(url, deps?)` handles loading/error/reload; `apiPost` for mutations; `useAction()` for
  busy/error state. No global state library — each screen owns its data.
- Design tokens live in `tailwind.config.ts` (`ink`, `turf`, `gold`, `ember`, `danger`, `slateink`)
  and the component classes in `app/globals.css` (`card`, `btn`, `badge`, `table-base`).
- Charts are thin recharts wrappers in `components/charts.tsx`; every chart is paired with a table
  or a caption so the information is not chart-only.

## Scaling notes

- The JSON store is a single-writer file guarded by an in-process global. That is fine for a demo
  and for a single-instance pilot; for anything else use PostgreSQL (§DEPLOYMENT).
- Rate limiting is in-process. Behind more than one instance, move the bucket to Redis — the call
  site (`rateLimit(key, limit)`) stays identical.
- Match simulation is O(simulations × 120 balls). 5 000 simulations take roughly 150–400 ms on
  one core; the API caps at 20 000.

## Public site vs private workspace (quality, SEO & trust module)

```
app/
  layout.tsx              root metadata (metadataBase, OG/Twitter, robots, viewport) + <AnalyticsProvider/>
  opengraph-image.tsx     branded 1200×630 share card (next/og)
  not-found.tsx           branded 404 with public header/footer
  sitemap.ts robots.ts    crawling surface (public pages only)
  (public)/               indexable: /, /tour, /faq, /privacy, /testimonials, /contact, /thank-you
  login/                  client page + server layout that supplies its metadata
  (app)/                  private: session-validated layout, per-route metadata, breadcrumbs
middleware.ts             HTTPS + canonical-host + session gate + security headers (edge)
lib/
  site.ts                 page/metadata registry (single source of truth)
  content/                FAQ and 30-module tour copy
  core/growth/            forms (sanitise, validate, rate limit, CAPTCHA), feedback, testimonials
  core/security/edge.ts   edge-safe helpers, unit-tested
  client/analytics.ts     allowlisted, consent-gated GA4 events
components/
  public-chrome.tsx faq-explorer.tsx contact-form.tsx growth-admin.tsx analytics.tsx breadcrumbs.tsx
```

Two rules keep the split honest:

1. **Data never crosses into the public tree.** Public pages read either static content
   (`lib/content/*`) or, for `/testimonials`, the published subset of the testimonials
   collection — never players, matches, reports or datasets.
2. **Metadata cannot drift.** Titles, descriptions, canonical paths and sitemap inclusion are
   declared once in `lib/site.ts`; pages consume them and the test suite enforces uniqueness,
   length limits and the public/private boundary.
