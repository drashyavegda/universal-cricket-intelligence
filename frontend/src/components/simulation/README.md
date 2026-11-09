# components/simulation/ — Prediction lab

Status: **mapped** (source lives at the repository root today).

## Real sources

* `app/(app)/prediction/page.tsx`

## Contents

* team selectors, simulation count, seed, probability dials, score bands, forecast-quality card

## Rule

Probabilities must render as summing to 1; quality metrics shown alongside.

## Moving here (phase 5)

1. Create `components/simulation/` under `frontend/src/`.
2. Move the files listed above; keep named exports and the existing class contracts.
3. Update imports with the project-wide search/replace (`@/components/…`).
4. Re-run `npm run typecheck && npm test && npm run build` before committing.
