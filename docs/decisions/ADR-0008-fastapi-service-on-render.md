# ADR-0008 — Optional FastAPI service for heavy compute on Render

* Status: Accepted (phase-2 scaffold in `backend/`; phase-1 service in `services/analytics`)
* Date: 2026-11-09

## Context
Some workloads (large regressions, thousands of Monte Carlo runs, batch scoring) are better served
by Python than by Node request handlers, and a serverless frontend has execution-time limits.

## Decision
Keep a Python service that is **optional**:
* phase 1 — `services/analytics` (2 source files) for statistics; the app computes locally when it
  is absent.
* phase 2 — `backend/` (this package) with proper config, logging, CORS allow-list, health, request
  ids and a typed error envelope, deployable to Render.
* The Next.js BFF calls it with a timeout and falls back to local compute on any failure.

## Consequences
* A sleeping free Render instance cannot break a page.
* Two runtimes to keep in parity — phase 4 requires parity tests against `lib/core/**`.
* Clearing-houses: CORS must list exact origins; the service must not be public without a token.

## Alternatives considered
* Move all analytics to Python — rejected: it would duplicate established, tested TypeScript engines.
* Serverless Python functions on the same host — rejected: cold starts and split deployments for
  little benefit at this scale.
