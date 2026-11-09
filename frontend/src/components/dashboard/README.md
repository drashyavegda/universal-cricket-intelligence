# components/dashboard/ — Command overview

Status: **mapped** (source lives at the repository root today).

## Real sources

* `app/(app)/dashboard/page.tsx + components/charts.tsx`

## Contents

* KPI tiles (players, trust, squad balance), quality alerts, recent fixtures, AI budget, sparkline

## Rule

Aggregates only — no maths in the component; it renders `/api/overview`.

## Moving here (phase 5)

1. Create `components/dashboard/` under `frontend/src/`.
2. Move the files listed above; keep named exports and the existing class contracts.
3. Update imports with the project-wide search/replace (`@/components/…`).
4. Re-run `npm run typecheck && npm test && npm run build` before committing.
