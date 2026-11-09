# features/player-intelligence — Player intelligence

**Purpose:** One defensible, evidence-backed profile per player.

**Status:** Implemented — `tests/stats.test.ts`, `team-intel.test.ts`

## Scope (implemented)

* phase splits, rate metrics, form and consistency
* risk band with named components
* provenance and confidence visible next to every number

## Implementation pointers

* `lib/core/players/metrics.ts`
* `lib/core/players/risk.ts`
* `lib/core/players/potential.ts`
* `app/api/players/[id]/route.ts`

**API:** `GET /api/players/[id]`  ·  **UI:** `/players/[id]`

## Acceptance criteria

1. Every number is produced by a `lib/core` engine — the component only renders it.
2. Sample size, confidence or a caveat is visible wherever an estimate appears.
3. Loading, empty and error states are rendered.
4. Deterministic for identical input (seeded where random).
5. Unit tests cover the maths; the smoke suite covers the wire.

## Open items (not implemented)

* role-specific benchmarks per competition (needs larger cohorts)

## Notes for the frontend/ split

When `lib/` and `app/` move under `frontend/src/`, keep this folder as the **feature spec**.
Feature-local components may move here later; shared primitives stay in `../components/`.
Do not create a second copy of the engines — the pointer list above is the contract.
