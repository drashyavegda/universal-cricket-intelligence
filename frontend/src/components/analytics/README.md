# components/analytics/ — Statistical workbench

Status: **mapped** (source lives at the repository root today).

## Real sources

* `app/(app)/stats/page.tsx`
* `components/charts.tsx`

## Contents

* method picker, result table, assumption notes, histogram/line charts

## Rule

Every result shows its method and assumptions; no bare numbers.

## Moving here (phase 5)

1. Create `components/analytics/` under `frontend/src/`.
2. Move the files listed above; keep named exports and the existing class contracts.
3. Update imports with the project-wide search/replace (`@/components/…`).
4. Re-run `npm run typecheck && npm test && npm run build` before committing.
