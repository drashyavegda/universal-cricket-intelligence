# ADR-0005 — Public marketing routes separated from the private workspace

* Status: Accepted
* Date: 2026-11-09

## Context
The workspace previously lived at `/`, so a search engine could reach dashboards, and there was no
public page explaining the product, the FAQ or the privacy policy.

## Decision
* `app/(public)/**` hosts indexable pages (`/`, `/tour`, `/faq`, `/privacy`, `/testimonials`,
  `/contact`, `/thank-you`), wrapped in a public shell with its own header/footer.
* `app/(app)/**` hosts the workspace at `/dashboard` and children, gated by middleware **and**
  server-side session validation, with `noindex` meta and `X-Robots-Tag`.
* Public pages never import workspace data sources; only the published-testimonials subset is read.

## Consequences
* One application, two audiences, no duplicated design system.
* Older links to `/` now land on the landing page — a deliberate, documented change (`CHANGELOG`).
* Tests must keep proving the boundary: sitemap exclusion, robots disallow, 307 for anonymous
  workspace visits, and `X-Robots-Tag` presence.

## Alternatives considered
* Separate marketing site — rejected (two deploys, brand drift, duplicated components).
* Keeping the dashboard at `/` and adding marketing under `/site` — rejected: the landing page is
  the canonical entry point for shareable links.
