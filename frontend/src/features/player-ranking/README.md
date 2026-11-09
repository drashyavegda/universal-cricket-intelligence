# features/player-ranking — Player ranking

**Purpose:** Configurable ordering with explicit coverage.

**Status:** Implemented — `tests/ranking.test.ts`

## Scope (implemented)

* weighted percentile scoring, no imputation
* coverage shrinkage for incomplete records
* deterministic for identical input

## Implementation pointers

* `lib/core/ranking/engine.ts`
* `app/api/rank/route.ts`

**API:** `POST /api/rank`  ·  **UI:** `/players, /talent`

## Acceptance criteria

1. Every number is produced by a `lib/core` engine — the component only renders it.
2. Sample size, confidence or a caveat is visible wherever an estimate appears.
3. Loading, empty and error states are rendered.
4. Deterministic for identical input (seeded where random).
5. Unit tests cover the maths; the smoke suite covers the wire.

## Open items (not implemented)

* rank history over time (needs scheduled snapshots)

## Notes for the frontend/ split

When `lib/` and `app/` move under `frontend/src/`, keep this folder as the **feature spec**.
Feature-local components may move here later; shared primitives stay in `../components/`.
Do not create a second copy of the engines — the pointer list above is the contract.
