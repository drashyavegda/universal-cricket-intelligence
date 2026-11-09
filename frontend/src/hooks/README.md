# src/hooks/

Intentionally empty. Today no shared custom hooks exist: data fetching goes through
`useApi()` in `lib/client/api.ts`, and page-specific state stays inside the page component
(e.g. the search palette in `components/shell.tsx`, the upload progress in `app/(app)/data/page.tsx`).

Create a hook here when the same effect is needed in three or more places, for example:
* `useDebouncedValue` (the palette search uses a 220 ms timeout inline),
* `useMediaQuery` (mobile behaviour is CSS-only today),
* `useConsent()` (analytics consent is read via `lib/client/analytics.ts`).

Rule: hooks must be client-only (`'use client'` at the importing component) and must not fetch
without an abort handle.
