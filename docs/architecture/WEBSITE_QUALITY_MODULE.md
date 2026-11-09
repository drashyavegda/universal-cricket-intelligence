# Website quality, SEO, trust & growth module

Implementation note for the 14 website features. Requirements and verification:
[`../requirements/WEBSITE_REQUIREMENTS_14.md`](../requirements/WEBSITE_REQUIREMENTS_14.md).
Content catalogues: [`../../marketing-seo/`](../../marketing-seo/) and [`../../legal/`](../../legal/).

## 1. Route split

```
app/
  layout.tsx            root: metadataBase, OG/Twitter defaults, robots, viewport, <AnalyticsProvider/>
  opengraph-image.tsx   branded 1200×630 share card (next/og, runtime generated)
  not-found.tsx         branded 404 with public chrome
  robots.ts sitemap.ts  crawling surface (public pages only)
  login/                client page + server layout for metadata
  (public)/             / · /tour · /faq · /privacy · /testimonials · /contact · /thank-you
  (app)/                private workspace, session-validated, per-route metadata, breadcrumbs
```

## 2. Metadata registry (single source of truth)

`lib/site.ts` exports:

* `SITE` — name, legal name, canonical URL (from `NEXT_PUBLIC_SITE_URL`), locale, keywords,
  contact email, Twitter handle, theme colour.
* `PUBLIC_PAGES` — `{path, title, description, indexable, sitemapPriority, changeFrequency}`.
* `PRIVATE_ROUTES` — same shape without sitemap fields.
* `PRIVATE_PREFIXES` — consumed by robots, middleware and the sitemap exclusion test.
* `ogFor()`, `twitterFor()`, `SHARE_IMAGE`, `absoluteUrl()`.

Why a registry: Next merges metadata per field, so a page that overrides `openGraph` silently
drops the inherited image; and duplicate titles/descriptions are the most common SEO defect.
`tests/growth.test.ts` fails the build on duplicates, out-of-range lengths, or a private path
appearing in the sitemap.

## 3. Images

| Card | Route | Contents |
| --- | --- | --- |
| Default | `app/opengraph-image.tsx` | brand lockup, headline, three capability chips — 1200×630 |
| Player | `app/(app)/players/[id]/opengraph-image.tsx` | name, role, team, format, capped/uncapped, DEMO/UPLOADED chip — no statistics |

Satori limitations respected: only `linear-gradient` plus solid overlays (radial gradients with
position syntax throw at build time — learned the hard way).

`PUBLIC_PLAYER_PREVIEWS=false` replaces the name with generic branding for real, non-consented
player data while keeping the URL working for unfurls.

## 4. Crawling controls

| Control | Implementation |
| --- | --- |
| sitemap | `app/sitemap.ts` — `PUBLIC_PAGES.filter(p => p.indexable)` |
| robots | `app/robots.ts` — allow `/`, disallow every workspace prefix + `/api/`, `/login`, `/thank-you`, `/_next/`; absolute `Sitemap:` |
| meta robots | private layouts `{index:false, follow:false}`; login/thank-you `noindex` |
| header | `X-Robots-Tag: noindex, nofollow, noarchive` on private paths (middleware + `next.config.mjs`) |
| access | session gate — indexing controls are defence in depth, not the primary protection |

## 5. Forms and spam

Pipeline order (cheapest first): rate limit → honeypot → timing → CAPTCHA (optional) →
validation/sanitisation → duplicate suppression → persist → audit + notification.
Every response includes a `checks[]` trace so a rejection is explainable to a user and a
developer. Full policy in [`../../security/SPAM_PROTECTION.md`](../../security/SPAM_PROTECTION.md).

## 6. Thank-you and failure semantics

`/thank-you` renders one of three states: confirmed (valid `FB-XXXXXX` reference), failed
(`?status=failed`), or nothing-to-confirm. The client navigates only on
`res.ok && data.ok && data.reference`; any other path renders an inline error and keeps the
user's text. **No code path can show success after a failed submission.**

## 7. Analytics

`lib/client/analytics.ts` — allowlist of 14 parameter names, count bucketing, consent from
localStorage, Do Not Track treated as decline. `components/analytics.tsx` loads the GA4 script
only after consent and only when `NEXT_PUBLIC_GA_MEASUREMENT_ID` exists; otherwise it renders
nothing. Event catalogue: [`../../marketing-seo/analytics/GA4_EVENT_CATALOGUE.md`](../../marketing-seo/analytics/GA4_EVENT_CATALOGUE.md).

## 8. Testimonial integrity

Sample rows (`sample: true`, named "Sample Persona …") are labelled in the UI, excluded from
`published` counts, deletable in bulk, and never emitted as structured data. Adding a real quote
requires an owner to type it into the admin panel; every change is audited.

## 9. Operating checklist after a content change

- [ ] `npx vitest run tests/growth.test.ts` (registry uniqueness + FAQ/tour integrity)
- [ ] `node scripts/smoke.mjs` (metadata, sitemap, robots, OG, 404, forms)
- [ ] Re-check `/sitemap.xml` and `/robots.txt` against the production domain
- [ ] Confirm no private route leaked into the sitemap
