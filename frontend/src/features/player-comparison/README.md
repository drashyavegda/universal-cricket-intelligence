# features/player-comparison — Player comparison

**Purpose:** 2–8 players, honest like-for-like context.

**Status:** Implemented — `tests/stats.test.ts`

## Scope (implemented)

* radar overlays and percentile tables
* mixed-role warnings
* replacement simulator for squad building

## Implementation pointers

* `app/(app)/compare/page.tsx`
* `app/api/compare/route.ts`
* `components/charts.tsx`

**API:** `POST /api/compare`  ·  **UI:** `/compare`

## Acceptance criteria

1. Every number is produced by a `lib/core` engine — the component only renders it.
2. Sample size, confidence or a caveat is visible wherever an estimate appears.
3. Loading, empty and error states are rendered.
4. Deterministic for identical input (seeded where random).
5. Unit tests cover the maths; the smoke suite covers the wire.

## Open items (not implemented)

* similarity search by statistical fingerprint (phase 5)

## Notes for the frontend/ split

When `lib/` and `app/` move under `frontend/src/`, keep this folder as the **feature spec**.
Feature-local components may move here later; shared primitives stay in `../components/`.
Do not create a second copy of the engines — the pointer list above is the contract.
