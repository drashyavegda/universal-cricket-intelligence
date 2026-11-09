# components/players/ — Player intelligence cards

Status: **mapped** (source lives at the repository root today).

## Real sources

* `app/(app)/players/page.tsx`
* `app/(app)/players/[id]/page.tsx`
* `components/charts.tsx`

## Contents

* directory table with filters, profile tabs (metrics/risk/phases/workload/trajectory)
* fingerprint radar, form trend, area trend charts

## Rule

Low-sample metrics must render their denominator; never hide `null` behind a 0.

## Moving here (phase 5)

1. Create `components/players/` under `frontend/src/`.
2. Move the files listed above; keep named exports and the existing class contracts.
3. Update imports with the project-wide search/replace (`@/components/…`).
4. Re-run `npm run typecheck && npm test && npm run build` before committing.
