# Website quality, SEO, trust & growth — 14 requirements

Implementation detail: [`../architecture/WEBSITE_QUALITY_MODULE.md`](../architecture/WEBSITE_QUALITY_MODULE.md).
This page is the requirement ↔ verification contract.

| ID | Requirement | Implementation | Verified by |
| --- | --- | --- | --- |
| WF-1 | Custom 404 page with navigation | `app/not-found.tsx` (public header/footer, 6 links, back button, report-a-link) | smoke: `GET /this-page-does-not-exist` → 404 + "Error 404" + "Command overview" |
| WF-2 | Separate page titles | `lib/site.ts` registry + 25 route layouts; root template `%s · UCIP`; player title from record | `tests/growth.test.ts › SEO registry`; smoke title regex |
| WF-3 | Meta descriptions | registry, 70–160 chars, unique | same test asserts uniqueness + length |
| WF-4 | OG / social preview images | `app/opengraph-image.tsx` (1200×630) + dynamic player card; `ogFor()`/`twitterFor()` always declare it | smoke checks `og:image`, width 1200, height 630; PNG fetched and inspected (144 KB / 128 KB) |
| WF-5 | Internal linking & breadcrumbs | public footer + landing link blocks; `components/breadcrumbs.tsx`; player "Related analysis" block | manual walk: every workspace page ≤2 clicks from `/dashboard`; no loops |
| WF-6 | XML sitemap (public only) | `app/sitemap.ts` from `PUBLIC_PAGES.filter(indexable)` | smoke: 6 `<loc>`, zero private prefixes |
| WF-7 | robots.txt | `app/robots.ts`: disallow workspace prefixes, `/api/`, `/login`, `/thank-you`; absolute sitemap | smoke asserts `Disallow: /dashboard`, `Disallow: /api/`, `Sitemap:` |
| WF-8 | HTTPS & secure connections | `middleware.ts` + `lib/core/security/edge.ts` (HSTS, nosniff, referrer, permissions, COOP); HttpOnly/SameSite cookie; `vercel.json`/`render.yaml` for edge TLS + `X-Frame-Options` | unit tests for `shouldRedirectToHttps`/`canonicalHostTarget`/`securityHeaders`; curl header assertions |
| WF-9 | Spam protection | `lib/core/growth/forms.ts`: rate limit (5/10 min/IP), honeypot, ≥1.2 s fill time, optional Turnstile, sanitisation, 3-link cap, 15-min duplicate suppression, hashed IP | smoke: 422 / 400 / 400 / 201 / 409 / 429; unit tests for each path |
| WF-10 | Thank-you page | three exclusive states (confirmed / failed / nothing to confirm); success requires `^FB-[A-Z0-9]{6}$` | curl of all three states; client only navigates after `ok && reference` |
| WF-11 | Google Analytics 4 | `lib/client/analytics.ts` (allowlist, bucketed counts) + `components/analytics.tsx` (consent gate, DNT) | unit tests (consent server-side, bucket, allowlist); manual: no request before consent |
| WF-12 | Privacy policy | `app/(public)/privacy/page.tsx` — 12 sections incl. retention, cookies, analytics, datasets, third parties, deletion | content review against actual behaviour |
| WF-13 | Searchable FAQ | `lib/content/faq.ts` (22 answers / 8 categories) + `components/faq-explorer.tsx` + plain-HTML list + `FAQPage` JSON-LD on `/faq` only | unit tests (unique ids/questions, answer length, category coverage); smoke checks JSON-LD |
| WF-14 | Testimonials management | `lib/core/growth/testimonials.ts` + `POST/PATCH/DELETE /api/testimonials` (owner-only) + Settings → Growth & trust; sample rows labelled | smoke: anon 401, analyst 403, owner 201; page shows "No verified testimonials are published yet" |

## Environment variables introduced by these requirements
`NEXT_PUBLIC_SITE_URL` (canonical + sitemap), `NEXT_PUBLIC_CONTACT_EMAIL`,
`NEXT_PUBLIC_TWITTER_HANDLE`, `NEXT_PUBLIC_GA_MEASUREMENT_ID`,
`NEXT_PUBLIC_TURNSTILE_SITE_KEY` + `TURNSTILE_SECRET_KEY`, `ENFORCE_HTTPS`,
`CANONICAL_HOST`, `PUBLIC_PLAYER_PREVIEWS`. All optional; documented in
[`../deployment/ENVIRONMENT_VARIABLES.md`](../deployment/ENVIRONMENT_VARIABLES.md).

## Deliberate non-claims
* No certification (ISO 27001, SOC 2, PCI) is claimed.
* FAQ rich results are not promised — only valid markup is shipped.
* No Review/AggregateRating schema for testimonials (self-serving + unverifiable).
* No public report pages, therefore no "share report" cards; rationale documented.
