# components/layout/ — Shells and navigation

Status: **mapped** (source lives at the repository root today).

## Real sources

* `components/shell.tsx`
* `components/public-chrome.tsx`
* `components/breadcrumbs.tsx`
* `components/back-button.tsx`

## Contents

* workspace shell: sidebar nav, search palette (Ctrl+K), notifications, profile menu, breadcrumbs
* public header/footer with mobile nav and skip link

## Rule

Navigation structure is data (`NAV` array) + route constants; keep them aligned with app/.

## Moving here (phase 5)

1. Create `components/layout/` under `frontend/src/`.
2. Move the files listed above; keep named exports and the existing class contracts.
3. Update imports with the project-wide search/replace (`@/components/…`).
4. Re-run `npm run typecheck && npm test && npm run build` before committing.
