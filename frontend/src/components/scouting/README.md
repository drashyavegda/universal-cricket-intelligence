# components/scouting/ — Talent & discovery

Status: **mapped** (source lives at the repository root today).

## Real sources

* `app/(app)/talent/page.tsx`
* `app/(app)/scouting/page.tsx`

## Contents

* talent filters + preset cards + sensitivity panel; discovery missions with verification chips

## Rule

Sensitivity output is part of the feature, not optional decoration.

## Moving here (phase 5)

1. Create `components/scouting/` under `frontend/src/`.
2. Move the files listed above; keep named exports and the existing class contracts.
3. Update imports with the project-wide search/replace (`@/components/…`).
4. Re-run `npm run typecheck && npm test && npm run build` before committing.
