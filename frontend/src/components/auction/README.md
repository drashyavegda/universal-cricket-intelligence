# components/auction/ — Auction command

Status: **mapped** (source lives at the repository root today).

## Real sources

* `app/(app)/auction/page.tsx`

## Contents

* valuation cards, bid-ceiling ladder, scarcity panel, seeded auction room, purse tracker

## Rule

Seed is visible and editable so a scenario can be replayed in a meeting.

## Moving here (phase 5)

1. Create `components/auction/` under `frontend/src/`.
2. Move the files listed above; keep named exports and the existing class contracts.
3. Update imports with the project-wide search/replace (`@/components/…`).
4. Re-run `npm run typecheck && npm test && npm run build` before committing.
