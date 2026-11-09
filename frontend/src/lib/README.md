# src/lib/ — engine layer map

Live location: `lib/` at the repository root (40 modules). Split:

```
lib/
├── api/helpers.ts          guard(), json(), fail(), readBody(), serverError(), context(), SESSION_COOKIE
├── client/api.ts           browser fetch façade (apiGet/apiPost/useApi)
├── client/analytics.ts     consent-gated GA4 events with an allowlist
├── content/faq.ts          22 FAQ answers, 8 categories
├── content/tour.ts         30 module descriptors
├── site.ts                 SITE + metadata registry + ogFor/twitterFor/absoluteUrl
└── core/
    ├── types.ts            single domain model
    ├── rng.ts              mulberry32 seeded RNG
    ├── db/{store,seed}.ts  persistence façade + deterministic seed generator
    ├── auth/{crypto,service}.ts   scrypt, sessions, RBAC, 2FA, audit hooks
    ├── data/{parse,extract,synonyms,merge,quality,promote}.ts
    ├── players/{metrics,risk,potential}.ts
    ├── ranking/{engine,presets}.ts
    ├── stats/{descriptive,probability}.ts
    ├── team/{squad,xi,opposition}.ts
    ├── auction/{valuation,sim}.ts
    ├── sim/match.ts
    ├── pitch/venue.ts
    ├── career/trajectory.ts
    ├── workload/engine.ts
    ├── scouting/global.ts
    ├── knowledge/search.ts
    ├── shortlists/service.ts
    ├── reporting/{build,export}.ts
    ├── security/{posture,edge}.ts
    ├── growth/{forms,feedback,testimonials}.ts
    └── ai/{nlq,assistant,agents,gateway}.ts
```

## Rules
1. `lib/core/**` must not import React or `next/*` (except `next/server` in `lib/api/helpers.ts`) —
   that is what makes 168 tests fast and network-free.
2. `lib/core/db/store.ts` is the only module allowed to touch the filesystem.
3. `lib/site.ts` is the only place route metadata is declared.
4. Client code imports `lib/client/*` only; never a `lib/core` module that pulls in `fs`.

## Moving here (phase 5)
`git mv lib frontend/src/lib` and update the `@/*` path alias. No file contents change.
