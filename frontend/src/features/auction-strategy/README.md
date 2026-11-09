# features/auction-strategy — Auction strategy

**Purpose:** Valuation plus a seeded, replayable auction room.

**Status:** Implemented — `tests/valuation.test.ts`

## Scope (implemented)

* value bands and ordered bid ceilings with caveats
* role scarcity and team-need adjustments
* seeded simulation with purse enforcement

## Implementation pointers

* `lib/core/auction/valuation.ts`
* `lib/core/auction/sim.ts`
* `app/api/auction/route.ts`

**API:** `GET/POST /api/auction`  ·  **UI:** `/auction`

## Acceptance criteria

1. Every number is produced by a `lib/core` engine — the component only renders it.
2. Sample size, confidence or a caveat is visible wherever an estimate appears.
3. Loading, empty and error states are rendered.
4. Deterministic for identical input (seeded where random).
5. Unit tests cover the maths; the smoke suite covers the wire.

## Open items (not implemented)

* rival bidding tendencies learned from history (needs real auction logs)

## Notes for the frontend/ split

When `lib/` and `app/` move under `frontend/src/`, keep this folder as the **feature spec**.
Feature-local components may move here later; shared primitives stay in `../components/`.
Do not create a second copy of the engines — the pointer list above is the contract.
