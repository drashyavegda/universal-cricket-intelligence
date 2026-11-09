# features/predictive-analytics — Predictive analytics

**Purpose:** Seeded Monte Carlo with honest calibration.

**Status:** Implemented — `tests/xi-sim.test.ts`

## Scope (implemented)

* win probabilities summing to 1
* score bands / quantiles
* Brier and log-loss scoring against stored fixtures

## Implementation pointers

* `lib/core/sim/match.ts`
* `app/api/predict/route.ts`

**API:** `POST /api/predict`  ·  **UI:** `/prediction`

## Acceptance criteria

1. Every number is produced by a `lib/core` engine — the component only renders it.
2. Sample size, confidence or a caveat is visible wherever an estimate appears.
3. Loading, empty and error states are rendered.
4. Deterministic for identical input (seeded where random).
5. Unit tests cover the maths; the smoke suite covers the wire.

## Open items (not implemented)

* live in-play probability (needs a live feed — out of scope)

## Notes for the frontend/ split

When `lib/` and `app/` move under `frontend/src/`, keep this folder as the **feature spec**.
Feature-local components may move here later; shared primitives stay in `../components/`.
Do not create a second copy of the engines — the pointer list above is the contract.
