# features/statistical-analysis — Statistical analysis

**Purpose:** Rigorous stats on any numeric series.

**Status:** Implemented — `tests/stats.test.ts`

## Scope (implemented)

* descriptive, regression, correlation, outliers, normalisation, confidence intervals
* method notes printed with results
* null variance for single observations

## Implementation pointers

* `lib/core/stats/descriptive.ts`
* `lib/core/stats/probability.ts`
* `app/api/stats/route.ts`

**API:** `POST /api/stats`  ·  **UI:** `/stats`

## Acceptance criteria

1. Every number is produced by a `lib/core` engine — the component only renders it.
2. Sample size, confidence or a caveat is visible wherever an estimate appears.
3. Loading, empty and error states are rendered.
4. Deterministic for identical input (seeded where random).
5. Unit tests cover the maths; the smoke suite covers the wire.

## Open items (not implemented)

* weighted regression
* Bayesian shrinkage for small samples

## Notes for the frontend/ split

When `lib/` and `app/` move under `frontend/src/`, keep this folder as the **feature spec**.
Feature-local components may move here later; shared primitives stay in `../components/`.
Do not create a second copy of the engines — the pointer list above is the contract.
