# features/workload-management — Workload management

**Purpose:** Load monitoring without medical claims.

**Status:** Implemented — `tests/team-intel.test.ts`

## Scope (implemented)

* rolling windows, acute:chronic ratio, workload index
* rotation guidance
* null ratio when the chronic baseline is missing

## Implementation pointers

* `lib/core/workload/engine.ts`
* `app/api/workload/route.ts`

**API:** `GET /api/workload`  ·  **UI:** `/workload`

## Acceptance criteria

1. Every number is produced by a `lib/core` engine — the component only renders it.
2. Sample size, confidence or a caveat is visible wherever an estimate appears.
3. Loading, empty and error states are rendered.
4. Deterministic for identical input (seeded where random).
5. Unit tests cover the maths; the smoke suite covers the wire.

## Open items (not implemented)

* GPS/training-load import (needs a data source + privacy review)

## Notes for the frontend/ split

When `lib/` and `app/` move under `frontend/src/`, keep this folder as the **feature spec**.
Feature-local components may move here later; shared primitives stay in `../components/`.
Do not create a second copy of the engines — the pointer list above is the contract.
