# features/global-scouting — Global scouting

**Purpose:** Targeted recruitment missions across regions.

**Status:** Implemented — `tests/team-intel.test.ts`

## Scope (implemented)

* region/role/age missions
* verification status per hit (verified / unverified / requires trial)
* rationale sentence per hit

## Implementation pointers

* `lib/core/scouting/global.ts`
* `app/api/scouting/route.ts`

**API:** `POST /api/scouting`  ·  **UI:** `/scouting`

## Acceptance criteria

1. Every number is produced by a `lib/core` engine — the component only renders it.
2. Sample size, confidence or a caveat is visible wherever an estimate appears.
3. Loading, empty and error states are rendered.
4. Deterministic for identical input (seeded where random).
5. Unit tests cover the maths; the smoke suite covers the wire.

## Open items (not implemented)

* agent network workflows with assignments (phase 5)

## Notes for the frontend/ split

When `lib/` and `app/` move under `frontend/src/`, keep this folder as the **feature spec**.
Feature-local components may move here later; shared primitives stay in `../components/`.
Do not create a second copy of the engines — the pointer list above is the contract.
