# src/app/ — route inventory

The live App Router tree is at the repository root: `app/`. This is its map (30 pages, 26 layouts,
46 route handlers). Nothing is duplicated here.

## Public routes (`app/(public)/`) — indexable
| Route | File | Metadata |
| --- | --- | --- |
| `/` | `page.tsx` | landing; `title.absolute` to keep the keyword-first title |
| `/tour` | `tour/page.tsx` | 30-module tour |
| `/faq` | `faq/page.tsx` | 22 answers + `FAQPage` JSON-LD |
| `/privacy` | `privacy/page.tsx` | 12-section policy |
| `/testimonials` | `testimonials/page.tsx` | published only, samples labelled, `force-dynamic` |
| `/contact` | `contact/page.tsx` | form + anti-spam explainer |
| `/thank-you` | `thank-you/page.tsx` | three states, `noindex` |

Shared chrome: `app/(public)/layout.tsx` → `components/public-chrome.tsx` (header, footer, mobile nav)
and a skip link.

## Auth
| Route | File | Notes |
| --- | --- | --- |
| `/login` | `login/page.tsx` + `login/layout.tsx` | client page (needs a server layout for metadata); redirects to `?next=` after sign-in |

## Workspace routes (`app/(app)/`) — private, `noindex`, session-gated
`/dashboard`, `/data`, `/players`, `/players/[id]`, `/talent`, `/compare`, `/stats`, `/team`, `/xi`,
`/auction`, `/match`, `/pitch`, `/opposition`, `/prediction`, `/scouting`, `/workload`, `/research`,
`/assistant`, `/automation`, `/reports`, `/settings`.

Each segment has a `layout.tsx` carrying a unique title/description/canonical + `robots: {index:false}`.
`app/(app)/layout.tsx` performs the server-side session validation and renders `components/shell.tsx`.

## API handlers (`app/api/**/route.ts`) — 46 routes

Grouped: auth (3) · data (7) · players/intelligence (6) · team/auction/match (11) · knowledge-AI (5) ·
reports-shortlists (7) · settings/audit/notifications (4) · public/growth (3). Full table:
[`../../../docs/api/API_REFERENCE.md`](../../../docs/api/API_REFERENCE.md).

## Metadata & crawling files
| File | Purpose |
| --- | --- |
| `app/layout.tsx` | `metadataBase`, title template, OG/Twitter defaults, robots, viewport, analytics provider |
| `app/opengraph-image.tsx` | branded 1200×630 share card (runtime) |
| `app/not-found.tsx` | branded 404 |
| `app/sitemap.ts`, `app/robots.ts` | crawling surface |
| `middleware.ts` (root) | session gate, HTTPS/canonical redirect, security + `X-Robots-Tag` headers |

## Conventions
1. A page never computes cricket maths; it calls an API route.
2. Any client page using `useSearchParams()` must be wrapped in `<Suspense>` (`/compare` and `/login`
   both do — the build fails otherwise).
3. New private segment ⇒ add `layout.tsx` metadata **and** a row in `lib/site.ts` (`PRIVATE_ROUTES`).
4. New public page ⇒ add to `PUBLIC_PAGES` with `indexable` decided explicitly.
