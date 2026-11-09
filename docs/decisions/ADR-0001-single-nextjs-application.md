# ADR-0001 — One Next.js application instead of an early frontend/backend split

* Status: Accepted
* Date: 2026-11-09
* Deciders: Architecture

## Context
The brief describes a `frontend/` + `backend/` split. At build time the product needed 30 features
delivered by a small team with no paid infrastructure. Splitting early would have meant CORS,
duplicated types, two deploy pipelines and a data contract to maintain — before a single
analytics formula was validated.

## Decision
Ship one Next.js 14 application: App Router for the UI, route handlers for the API, and
`lib/core/**` for deterministic engines, calling a store façade. Provide a **thin, documented**
`frontend/` and `backend/` taxonomy in the structure package so the split can happen later without
guesswork, and keep the optional Python compute service (`services/analytics`).

## Consequences
* Faster delivery, one build, one deploy, shared TypeScript types end to end.
* No network hop between UI and analytics; the whole app is testable in-process (151 tests).
* Serverless body limits and ephemeral disks become real constraints (documented in
  `docs/deployment/TROUBLESHOOTING.md`).
* The split remains available as a phase-5 refactor with a reversible checklist.

## Alternatives considered
* **Split now** — rejected: CORS/deploy overhead with no user-visible benefit at this stage.
* **Separate marketing site** — rejected: SEO content must share the design system and the same
  release cycle (it would drift and duplicate the brand).
* **Client-side SPA + API** — rejected: private analytics pages benefit from server-side session
  validation and server-rendered metadata.
