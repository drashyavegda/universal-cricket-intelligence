# features/conversational-ai — Conversational AI

**Purpose:** Natural-language access to the engines.

**Status:** Implemented — `tests/assistant-reporting.test.ts`

## Scope (implemented)

* intent + entity extraction (EN/HI/GU phrasing)
* evidence-only narration; deterministic fallback without a key
* write intents require explicit confirmation

## Implementation pointers

* `lib/core/ai/nlq.ts`
* `lib/core/ai/assistant.ts`
* `lib/core/ai/gateway.ts`
* `app/api/assistant/route.ts`

**API:** `POST /api/assistant`  ·  **UI:** `/assistant`

## Acceptance criteria

1. Every number is produced by a `lib/core` engine — the component only renders it.
2. Sample size, confidence or a caveat is visible wherever an estimate appears.
3. Loading, empty and error states are rendered.
4. Deterministic for identical input (seeded where random).
5. Unit tests cover the maths; the smoke suite covers the wire.

## Open items (not implemented)

* conversation memory across turns
* streaming responses

## Notes for the frontend/ split

When `lib/` and `app/` move under `frontend/src/`, keep this folder as the **feature spec**.
Feature-local components may move here later; shared primitives stay in `../components/`.
Do not create a second copy of the engines — the pointer list above is the contract.
