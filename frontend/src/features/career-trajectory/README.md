# features/career-trajectory — Career trajectory

**Purpose:** Projection only when history exists.

**Status:** Implemented — `tests/team-intel.test.ts`

## Scope (implemented)

* season-series based projection
* returns zero forecasts plus an uncertainty note without a series (tested)
* MODEL labelling on every projected value

## Implementation pointers

* `lib/core/career/trajectory.ts`

**API:** `GET /api/players/[id]`  ·  **UI:** `/players/[id]`

## Acceptance criteria

1. Every number is produced by a `lib/core` engine — the component only renders it.
2. Sample size, confidence or a caveat is visible wherever an estimate appears.
3. Loading, empty and error states are rendered.
4. Deterministic for identical input (seeded where random).
5. Unit tests cover the maths; the smoke suite covers the wire.

## Open items (not implemented)

* age-curve priors per role (needs a research dataset)

## Notes for the frontend/ split

When `lib/` and `app/` move under `frontend/src/`, keep this folder as the **feature spec**.
Feature-local components may move here later; shared primitives stay in `../components/`.
Do not create a second copy of the engines — the pointer list above is the contract.
