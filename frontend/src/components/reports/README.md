# components/reports/ — Reports & exports

Status: **mapped** (source lives at the repository root today).

## Real sources

* `app/(app)/reports/page.tsx`

## Contents

* builder picker, generate action, quality gate, section viewer, six export buttons

## Rule

Export buttons are plain anchors to the API so downloads work without JS state.

## Moving here (phase 5)

1. Create `components/reports/` under `frontend/src/`.
2. Move the files listed above; keep named exports and the existing class contracts.
3. Update imports with the project-wide search/replace (`@/components/…`).
4. Re-run `npm run typecheck && npm test && npm run build` before committing.
