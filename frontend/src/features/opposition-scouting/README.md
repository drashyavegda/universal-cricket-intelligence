# features/opposition-scouting — Opposition scouting

**Purpose:** Pre-match plan against a specific opponent.

**Status:** Implemented — `tests/team-intel.test.ts`

## Scope (implemented)

* form, key threats, dependency indicators
* phase plans and head-to-head match-ups
* explicit inference labelling

## Implementation pointers

* `lib/core/team/opposition.ts`
* `app/api/opposition/route.ts`

**API:** `POST /api/opposition`  ·  **UI:** `/opposition`

## Acceptance criteria

1. Every number is produced by a `lib/core` engine — the component only renders it.
2. Sample size, confidence or a caveat is visible wherever an estimate appears.
3. Loading, empty and error states are rendered.
4. Deterministic for identical input (seeded where random).
5. Unit tests cover the maths; the smoke suite covers the wire.

## Open items (not implemented)

* video/observation notes (needs a note store)

## Notes for the frontend/ split

When `lib/` and `app/` move under `frontend/src/`, keep this folder as the **feature spec**.
Feature-local components may move here later; shared primitives stay in `../components/`.
Do not create a second copy of the engines — the pointer list above is the contract.
