# marketing-seo/

Preparation for the public site's discoverability and outreach. All public claims must be supportable
(the step-2 rule): no invented metrics, clients, certifications or reviews.

```
marketing-seo/
├── KEYWORD_MAP.md          one primary intent per public page + the copy that satisfies it
├── CONTENT_CALENDAR.md     what to publish, in what order, with acceptance criteria
├── analytics/              GA4 event catalogue + measurement rules
└── outreach/               sequences for demo requests and partnerships (no scraped lists)
```

## Constraints that shape everything here

| Constraint | Consequence |
| --- | --- |
| No paid tools | keyword research from public sources; no rank-tracking subscription |
| No fabricated authority | no "trusted by" logos, no invented testimonials, no unearned badges |
| Six indexable pages | depth over breadth: each page must fully answer one intent |
| Private workspace | nothing behind the login is crawlable; sitemap is generated from `lib/site.ts` |

## Already implemented (step 2)
Unique per-page titles/descriptions, canonical URLs, `og:image` generated at runtime, `FAQPage` JSON-LD
on `/faq`, sitemap + robots generated from the registry, `X-Robots-Tag: noindex` on the workspace, and
breadcrumbs on deep pages.
