# components/forms/ — Forms and admin editors

Status: **mapped** (source lives at the repository root today).

## Real sources

* `components/contact-form.tsx`
* `components/growth-admin.tsx`
* `app/(app)/data/page.tsx`

## Contents

* public contact form (honeypot, consent, error states), testimonials/feedback admin, upload form

## Rule

Never render success on a failed request; keep the user's input on error.

## Moving here (phase 5)

1. Create `components/forms/` under `frontend/src/`.
2. Move the files listed above; keep named exports and the existing class contracts.
3. Update imports with the project-wide search/replace (`@/components/…`).
4. Re-run `npm run typecheck && npm test && npm run build` before committing.
