# features/venue-analysis — Venue analysis

**Purpose:** Conditions intelligence with evidence tags.

**Status:** Implemented — `tests/team-intel.test.ts`

## Scope (implemented)

* venue DNA (batting/bowling tilt, phase behaviour)
* toss strategy with confidence
* surface what-ifs

## Implementation pointers

* `lib/core/pitch/venue.ts`
* `app/api/pitch/route.ts`

**API:** `POST /api/pitch`  ·  **UI:** `/pitch`

## Acceptance criteria

1. Every number is produced by a `lib/core` engine — the component only renders it.
2. Sample size, confidence or a caveat is visible wherever an estimate appears.
3. Loading, empty and error states are rendered.
4. Deterministic for identical input (seeded where random).
5. Unit tests cover the maths; the smoke suite covers the wire.

## Open items (not implemented)

* weather forecast integration (needs a provider key)

## Notes for the frontend/ split

When `lib/` and `app/` move under `frontend/src/`, keep this folder as the **feature spec**.
Feature-local components may move here later; shared primitives stay in `../components/`.
Do not create a second copy of the engines — the pointer list above is the contract.
