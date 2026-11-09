# Input validation

Rule: **validate at the boundary, never trust the type system at the boundary.** Every API route
parses its body explicitly and returns `400 VALIDATION_FAILED` with per-field messages.

## Shared limits

| Concern | Limit | Enforced in |
| --- | --- | --- |
| JSON body | 1 MB | route handler (`readBody`) |
| Upload size | 25 MB per file (`MAX_UPLOAD_MB`) | upload route before parsing |
| Rows per dataset | 50,000 (`MAX_ROWS_PER_DATASET`) | parser |
| Page size | 25 default, 200 max (`PAGE_SIZE`) | list routes |
| Free text | 2,000 chars, control chars stripped | `sanitiseText()` |
| Identifiers | allow-list `[A-Za-z0-9_-]{1,64}` | path params before store lookup |
| Enumerations | explicit allow-list (`role`, `status`, `format`, `topic`) | zod schema per route |

## Per-surface notes

* **Uploads** — extension *and* content-type checked; `xlsx`/`pdf` parsed in memory with a size guard;
  parsed cells are coerced to strings and truncated; no formula evaluation, no macro execution.
* **Numeric analytics input** — arrays capped (50k), NaN/Infinity dropped with a note in the response,
  and any percentage input must be 0–100 (0–1 rejected to avoid a silent 100× error).
* **Export** — `format` allow-listed (`md|html|pdf|docx|xlsx|pptx`); the filename is generated, never
  taken from the request (prevents path traversal and header injection).
* **SQL path** — parameterised statements only; `DATABASE_URL` from the environment; no string
  concatenation of identifiers.
* **File paths** — the JSON store path is derived from `DATA_DIR` and a fixed filename; a request can
  never choose a path.

## Output encoding

* HTML exports escape all interpolated strings (`&<>"'`); PDF/DOCX text is Latin-1 sanitised.
* JSON responses use the shared envelope and never include stack traces or SQL.
* The UI renders user text as text nodes (React escaping), never `dangerouslySetInnerHTML`.
