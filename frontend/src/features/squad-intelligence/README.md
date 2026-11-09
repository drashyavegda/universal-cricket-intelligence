# features/squad-intelligence — Squad intelligence

**Purpose:** Structural squad analysis before the auction.

**Status:** Implemented — `tests/team-intel.test.ts`

## Scope (implemented)

* balance score, phase coverage, weaknesses with evidence
* P1–P3 priority gaps with suggestions
* purse and slot position

## Implementation pointers

* `lib/core/team/squad.ts`
* `app/api/team/[id]/route.ts`

**API:** `GET /api/team/[id]`  ·  **UI:** `/team`

## Acceptance criteria

1. Every number is produced by a `lib/core` engine — the component only renders it.
2. Sample size, confidence or a caveat is visible wherever an estimate appears.
3. Loading, empty and error states are rendered.
4. Deterministic for identical input (seeded where random).
5. Unit tests cover the maths; the smoke suite covers the wire.

## Open items (not implemented)

* multi-season squad evolution view

## Notes for the frontend/ split

When `lib/` and `app/` move under `frontend/src/`, keep this folder as the **feature spec**.
Feature-local components may move here later; shared primitives stay in `../components/`.
Do not create a second copy of the engines — the pointer list above is the contract.
