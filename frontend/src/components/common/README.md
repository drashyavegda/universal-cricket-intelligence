# components/common/ — Reusable primitives

Status: **mapped** (source lives at the repository root today).

## Real sources

* `components/ui.tsx`

## Contents

* Card, Button, Badge, Stat, KV, Alert, Empty, Loading, Field, Select, Tabs, ProgressBar, PageHeader
* formatters: nf (number), pct (percent), money (lakh)

## Rule

Every screen composes these. A bespoke button or card in a page file is a review block.

## Moving here (phase 5)

1. Create `components/common/` under `frontend/src/`.
2. Move the files listed above; keep named exports and the existing class contracts.
3. Update imports with the project-wide search/replace (`@/components/…`).
4. Re-run `npm run typecheck && npm test && npm run build` before committing.
