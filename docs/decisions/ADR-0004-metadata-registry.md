# ADR-0004 — One metadata registry instead of per-page strings

* Status: Accepted
* Date: 2026-11-09

## Context
The site needed unique titles and descriptions for 29 pages, plus correct Open Graph inheritance.
Next merges metadata per field, so a page that overrides `openGraph` silently loses the inherited
share image. Duplicate descriptions are the most common SEO defect and are invisible without a check.

## Decision
`lib/site.ts` declares every route's metadata once (`PUBLIC_PAGES`, `PRIVATE_ROUTES`,
`PRIVATE_PREFIXES`) plus `ogFor()` / `twitterFor()` / `SHARE_IMAGE` helpers that always include the
image. Pages consume the registry; tests fail the build on duplicates, out-of-range lengths, or a
private route appearing in the sitemap.

## Consequences
* Adding a page means adding one registry row; forgetting it fails a test rather than shipping a
  copy-pasted description.
* The sitemap generator can only ever read indexable public pages.
* Slightly more indirection when reading a page file — acceptable for the guarantee it buys.

## Alternatives considered
* Free-form `metadata` objects per page — rejected: unenforceable, drifted immediately.
* A CMS — rejected: no editorial team, and content must stay in version control.
