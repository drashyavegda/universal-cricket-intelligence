# features/match-intelligence — Match intelligence

**Purpose:** Phase profiles and match-ups from ball events.

**Status:** Implemented — `tests/xi-sim.test.ts`

## Scope (implemented)

* batter-vs-bowler match-ups computed from `match.events`
* phase-by-phase scoring patterns
* sparse-scorecard warnings

## Implementation pointers

* `lib/core/sim/match.ts`
* `app/(app)/match/page.tsx`

**API:** `GET /api/players/[id], fixtures via /api/players`  ·  **UI:** `/match`

## Acceptance criteria

1. Every number is produced by a `lib/core` engine — the component only renders it.
2. Sample size, confidence or a caveat is visible wherever an estimate appears.
3. Loading, empty and error states are rendered.
4. Deterministic for identical input (seeded where random).
5. Unit tests cover the maths; the smoke suite covers the wire.

## Open items (not implemented)

* ball-by-ball visual wagon wheels (needs coordinate data)

## Notes for the frontend/ split

When `lib/` and `app/` move under `frontend/src/`, keep this folder as the **feature spec**.
Feature-local components may move here later; shared primitives stay in `../components/`.
Do not create a second copy of the engines — the pointer list above is the contract.
