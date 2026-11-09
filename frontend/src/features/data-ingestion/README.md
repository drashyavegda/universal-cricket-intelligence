# features/data-ingestion — Data ingestion

**Purpose:** Upload, parse and map any reasonable cricket file.

**Status:** Implemented — `tests/data.test.ts`

## Scope (implemented)

* CSV/XLSX/JSON/TXT/PDF text-layer parsing in one pipeline
* synonym-based header mapping with unmapped columns preserved
* size and row caps enforced before parsing

## Implementation pointers

* `app/api/upload/route.ts`
* `lib/core/data/parse.ts`
* `lib/core/data/extract.ts`
* `lib/core/data/synonyms.ts`

**API:** `POST /api/upload`  ·  **UI:** `/data`

## Acceptance criteria

1. Every number is produced by a `lib/core` engine — the component only renders it.
2. Sample size, confidence or a caveat is visible wherever an estimate appears.
3. Loading, empty and error states are rendered.
4. Deterministic for identical input (seeded where random).
5. Unit tests cover the maths; the smoke suite covers the wire.

## Open items (not implemented)

* OCR for scanned PDFs (explicitly out of scope)
* direct-to-storage uploads for >25 MB files (phase 3)

## Notes for the frontend/ split

When `lib/` and `app/` move under `frontend/src/`, keep this folder as the **feature spec**.
Feature-local components may move here later; shared primitives stay in `../components/`.
Do not create a second copy of the engines — the pointer list above is the contract.
