# features/talent-discovery — Talent discovery

**Purpose:** Age-banded, uncapped-eligible shortlist generation.

**Status:** Implemented — `tests/ranking.test.ts`

## Scope (implemented)

* strict age filters and cohort-internal percentiles
* headroom weighting for youth upside
* sensitivity report showing rank movement under weight changes

## Implementation pointers

* `lib/core/ranking/engine.ts`
* `lib/core/ranking/presets.ts`
* `app/api/talent/route.ts`

**API:** `POST /api/talent`  ·  **UI:** `/talent`

## Acceptance criteria

1. Every number is produced by a `lib/core` engine — the component only renders it.
2. Sample size, confidence or a caveat is visible wherever an estimate appears.
3. Loading, empty and error states are rendered.
4. Deterministic for identical input (seeded where random).
5. Unit tests cover the maths; the smoke suite covers the wire.

## Open items (not implemented)

* configurable presets stored per organisation (phase 3)

## Notes for the frontend/ split

When `lib/` and `app/` move under `frontend/src/`, keep this folder as the **feature spec**.
Feature-local components may move here later; shared primitives stay in `../components/`.
Do not create a second copy of the engines — the pointer list above is the contract.
