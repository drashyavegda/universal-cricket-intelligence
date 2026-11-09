# Website Quality, SEO, Trust & Growth

This document covers the fourteen-item module added on top of the analytics platform:
discoverability (titles, descriptions, social cards, sitemap, robots, linking), trust
(privacy policy, FAQ, testimonials, thank-you flow, security headers) and growth
(consent-gated analytics, spam-hardened public forms).

Everything below was implemented **inside the existing application** — same Next.js app,
same design system, same data store. No separate marketing site, no new runtime service,
no new npm dependency.

> **Honesty rule for this module.** If a capability depends on an external credential, a
> hosting-provider setting, or a real human testimonial, it is marked as such here and in
> the UI. Nothing on this page is described as "working" unless it was exercised against a
> running production build (evidence table at the end).

---

## 1. What was added, file by file

| Area | Files |
| --- | --- |
| Site + metadata registry | `lib/site.ts` (`SITE`, `PUBLIC_PAGES`, `PRIVATE_ROUTES`, `PRIVATE_PREFIXES`, `absoluteUrl`, `ogFor`, `twitterFor`, `SHARE_IMAGE`) |
| Root metadata / viewport | `app/layout.tsx` |
| Share images | `app/opengraph-image.tsx` (branded 1200×630), `app/(app)/players/[id]/opengraph-image.tsx` (dynamic) |
| Public site | `app/(public)/layout.tsx`, `page.tsx` (landing), `tour/`, `faq/`, `privacy/`, `testimonials/`, `contact/`, `thank-you/` |
| Public chrome | `components/public-chrome.tsx` (header, footer, mobile nav), `components/back-button.tsx` |
| 404 | `app/not-found.tsx` |
| Crawling | `app/sitemap.ts`, `app/robots.ts`, `middleware.ts` + `lib/core/security/edge.ts` |
| Headers / hosting | `next.config.mjs`, `vercel.json`, `render.yaml` |
| Forms | `lib/core/growth/forms.ts` (sanitise, validate, rate limit, honeypot, timing, CAPTCHA), `lib/core/growth/feedback.ts` (pipeline), `app/api/public/feedback/route.ts`, `components/contact-form.tsx` |
| Testimonials | `lib/core/growth/testimonials.ts`, `app/api/testimonials/route.ts`, `components/growth-admin.tsx` (Settings → Growth & trust), `lib/core/db/seed.ts#seedTestimonials` |
| Feedback inbox | `app/api/feedback/route.ts` |
| Analytics | `lib/client/analytics.ts` (allowlist + consent), `components/analytics.tsx` (GA4 loader + banner) |
| FAQ content | `lib/content/faq.ts`, `components/faq-explorer.tsx` |
| Tour content | `lib/content/tour.ts` |
| Internal linking | `components/breadcrumbs.tsx`, related-analysis block on `app/(app)/players/[id]/page.tsx` |
| Auth gate for private routes | `app/(app)/layout.tsx` (server-side session validation) |
| Tests | `tests/growth.test.ts` (45 tests), extended `scripts/smoke.mjs` (58 checks) |

Private (workspace) routes were moved behind an explicit gate: the dashboard now lives at
`/dashboard` instead of `/`, and every workspace segment carries its own `layout.tsx` with a
unique title, description, canonical and `robots: noindex`.

---

## 2. The fourteen items

### 2.1 Premium branded 404 with navigation
`app/not-found.tsx` renders the public header/footer, an editorial headline, six recovery
destinations (four workspace links are labelled "sign-in required"), a "back" button, a
"report a broken link" action that opens the contact form, and a hint about the workspace
search palette. Verified: `GET /this-page-does-not-exist` → **404** with the branded body.

### 2.2 Unique titles for every major page (+ dynamic player titles)
`lib/site.ts` is the single source of truth: `PUBLIC_PAGES` for indexable pages,
`PRIVATE_ROUTES` for the twenty workspace pages. The root layout uses the template
`"%s · UCIP"`, so every page renders `<title>Page Title · UCIP</title>`; the landing page
uses `title.absolute` to keep its keyword-first title. Player pages get a title generated
from the record itself: `"<Name> — <Role> Analytics Profile"`.

Uniqueness is enforced by test: `tests/growth.test.ts › SEO registry` asserts no duplicate
title, description or path, and that titles stay ≤ 65 characters.

### 2.3 Unique, keyword-relevant meta descriptions
Every page in the registry carries its own 70–160 character description written for that
page (not a template with the page name swapped in). The test above fails the build if any
description is out of range, duplicated, or if a private route reuses a public one.

### 2.4 Open Graph / Twitter cards and share images
* **Branded default card** — `app/opengraph-image.tsx` renders a 1200×630 PNG at request
  time with `next/og` (no binary asset to keep in sync). Verified: `Content-Type:
  image/png`, 1200×630, ~144 KB, visually inspected.
* **Dynamic player card** — `app/(app)/players/[id]/opengraph-image.tsx` draws the player's
  name, role, team, format, capped/uncapped status and the DEMO/UPLOADED provenance chip.
  No statistics, no contact data, no dataset identifiers. Verified: 200 `image/png`,
  1200×630 for a real seeded record.
* **Why the page metadata repeats the image** — Next merges metadata per field, so a page
  that overrides `openGraph` would silently drop the inherited image. `ogFor()` /
  `twitterFor()` always include `SHARE_IMAGE`, which is why every page emits
  `og:image`, `og:image:width=1200`, `og:image:height=630` and
  `twitter:card=summary_large_image`.
* **Public reports.** There are no public report pages in this build: reports are private
  workspace artefacts (`noindex`, session-gated). Generating a share card for a private
  report would leak its existence, so the branded default card is used instead. If you add
  a public report URL later, add `app/share/report/[token]/opengraph-image.tsx` with the
  same `ImageResponse` pattern — the route and token design is already sketched in
  `PRIVATE_PREFIXES` (`/share`).
* **Privacy switch.** `PUBLIC_PLAYER_PREVIEWS=false` makes the dynamic card fall back to
  generic branding (recommended once the workspace holds real, non-consented player data).
  Set to `false` in `render.yaml` already.

### 2.5 Meaningful internal linking and breadcrumbs
* Public footer: platform / trust / status columns linking tour, FAQ, privacy, contact,
  testimonials and the deletion-request entry point; sitemap and robots are linked.
* Landing page: five module groups, four-step "how it works", trust panel, and a
  "related pages" block.
* Workspace: `components/breadcrumbs.tsx` renders `Overview › Section › Record` with a
  `private · noindex` badge on every workspace page.
* Player profile: a "Related analysis" block links to comparison (pre-selected via
  `?ids=`), statistical workbench, talent discovery, auction valuation, scouting and the
  report builder, plus back-links to the directory, the command overview and the relevant
  FAQ answer.
* No link loops: every related link points to a different section, and the only
  self-reference is the breadcrumb of the current page (not a link).
* No broken links: all internal hrefs use existing routes; the smoke test walks eight
  public routes and the twenty workspace routes and fails on any non-200.

### 2.6 XML sitemap of public pages only
`app/sitemap.ts` emits `/` , `/tour`, `/faq`, `/testimonials`, `/contact`, `/privacy`
with `lastmod`, `changefreq` and `priority`. Private routes, `/api/*`, `/login` and
`/thank-you` are excluded **by construction** — the generator only reads entries with
`indexable: true`. Verified: 6 `<loc>` entries, none matching a private prefix (asserted in
the smoke test). There are no public dynamic routes in this build; if one is added it must
opt in via the registry.

### 2.7 Valid robots.txt
`app/robots.ts` publishes an `Allow: /` group with explicit `Disallow` entries for all
twenty workspace prefixes plus `/api/`, `/login`, `/thank-you` and `/_next/`, references the
absolute sitemap URL, and repeats the rules for aggressive crawlers (GPTBot, CCBot,
anthropic-ai, Bytespider) limited to the public pages. Decoys aside, robots.txt is treated
as a convention only — the real protection is session validation plus `X-Robots-Tag`.
Verified by fetching `/robots.txt` and asserting the private disallows and the sitemap line.

### 2.8 HTTPS, secure cookies, security headers
* **HTTP → HTTPS**: `ENFORCE_HTTPS=true` makes `middleware.ts` issue a 308 for
  non-HTTPS `x-forwarded-proto`, skipping localhost. Default is off because Vercel and
  Render already redirect at the edge (both are documented in `DEPLOYMENT.md` and
  configured in `vercel.json` / `render.yaml`). Decision logic is unit-tested
  (`shouldRedirectToHttps`), including the `http://` and `https` header variants.
* **Canonical host**: optional `CANONICAL_HOST` performs a 308 to the canonical origin
  (apex ↔ www consolidation), also unit-tested.
* **HSTS**: emitted when the request arrives over HTTPS (`max-age=63072000;
  includeSubDomains; preload`), in both middleware and `next.config.mjs`.
* **Other headers**: `X-Content-Type-Options: nosniff`, `Referrer-Policy:
  strict-origin-when-cross-origin`, `Permissions-Policy` (camera/microphone/geolocation/
  payment/usb all disabled), `X-DNS-Prefetch-Control: off`,
  `Cross-Origin-Opener-Policy: same-origin`, and `X-Robots-Tag: noindex, nofollow,
  noarchive` on private routes. `poweredByHeader: false` removes the framework banner.
* **Deliberately not set in-app**: `X-Frame-Options` / CSP `frame-ancestors`. This build is
  legitimately embedded in a hosting preview iframe, so an application-level deny would
  break it; both real deployment configs set `X-Frame-Options: SAMEORIGIN` instead.
* **Cookies**: the session cookie is HttpOnly, SameSite=Lax, `Secure` over HTTPS, 12-hour
  server-side expiry. (Existing behaviour, re-verified.)
* **No secrets in the browser**: AI/CAPTCHA secrets are server-side environment variables
  only; Settings shows a boolean `hasApiKey`, never the value. Verified by searching the
  client bundle and page HTML for the key patterns.

### 2.9 Spam protection on public forms
`lib/core/growth/forms.ts` + `feedback.ts`, applied in this order (cheapest first):

1. **Rate limit** — 5 messages per 10 minutes per IP, sliding window, `429` with a
   `Retry-After` header, state pruned so memory cannot grow unbounded.
2. **Honeypot** — a hidden `website` field; filled ⇒ rejected as `spam`.
3. **Timing** — a submission faster than 1.2 s after form mount is rejected.
4. **CAPTCHA** — Cloudflare Turnstile when `TURNSTILE_SECRET_KEY` is set; the result is
   reported honestly as `captcha:skipped(captcha-not-configured)` when it is not.
5. **Validation + sanitisation** — name 2–80, RFC-ish email, message 20–2000, category
   allowlist, consent required, control characters and zero-width characters stripped,
   `<`/`>` replaced, URLs capped (3+ links ⇒ rejected), stored `pageUrl` must be
   site-relative.
6. **Duplicate suppression** — identical email+message within 15 minutes ⇒ `409`.

Every response includes the `checks` trace so a rejection is explainable, and the UI keeps
the user's text on failure. Legitimate users are never blocked by a puzzle: with no
CAPTCHA key configured there is nothing to solve.

### 2.10 Professional thank-you page, separate failure handling
`/thank-you` has three mutually exclusive states: **confirmed** (only when the reference
matches `^FB-[A-Z0-9]{6}$`, i.e. the server actually stored the message), **failed**
(`?status=failed`, with a retry action and an explicit "nothing was stored" statement) and
**nothing to confirm** (no/unknown reference — the page refuses to claim success). It lists
the next steps, keeps navigation, and is `noindex`. The client only navigates to it after
`res.ok && data.ok && data.reference`; any other outcome renders an inline error instead.

### 2.11 GA4 via environment variables, consent-respecting
* Configured by `NEXT_PUBLIC_GA_MEASUREMENT_ID`. Unset ⇒ `AnalyticsProvider` renders
  `null`, no script is requested and no event is sent. Analytics is fully optional.
* Consent-gated: nothing loads before the visitor chooses in the banner; "Decline" and
  `navigator.doNotTrack === '1'` keep it off; the choice is stored in localStorage and can
  be revoked by clearing it (documented in the privacy policy).
* Events implemented: `page_view` (SPA-aware), `sign_in`, `sign_out`,
  `dataset_uploaded`, `report_generated`, `report_exported`, `form_submitted`,
  `form_failed`, `faq_opened`, `consent_granted`, `consent_denied`.
* Privacy: `lib/client/analytics.ts` scrubs every payload against a 14-key allowlist;
  counts are bucketed (`bucket(1234, 500) → "1000-1499"`), strings truncated to 64 chars,
  and player names / emails / file names / messages are not in the allowlist at all. IP
  anonymisation is enabled.

### 2.12 Privacy policy
`/privacy` — twelve sections: who/what the policy covers, data collected and why, lawful
basis, storage locations and retention (JSON store or PostgreSQL, 5,000-message inbox cap,
2,000-entry audit cap, 12-hour sessions), protection measures, cookies and local storage,
optional analytics, uploaded datasets and player information, third parties (all optional
and off by default), choices/deletion, children, changes and contact. It states plainly
that no certification (ISO 27001, SOC 2, PCI DSS) is claimed and that it is not legal
advice.

### 2.13 Searchable, categorised FAQ (+ structured data)
22 questions across 8 categories (platform, player analytics, uploads and data, auction,
AI and recommendations, accounts and security, privacy and deletion, limitations), with
instant search, category filters, an accordion and a plain-HTML list of the same answers
for crawlers and no-JS clients. Questions were written against the actual behaviour —
PDF question names the text-layer limitation, the AI questions say narration needs a key,
the limitations question lists what is not included.

Structured data: `FAQPage` JSON-LD is emitted **only** on `/faq`, where the answers are
also visible in plain HTML. We do not claim a rich result will appear — Google limits FAQ
rich results for most sites, and that is stated on the page and here.

### 2.14 Premium testimonials section with admin control
* Public page `/testimonials`: quote cards with name, role, organisation, optional image
  (initials fallback) and rating only when supplied.
* Admin: Settings → **Growth & trust** (`components/growth-admin.tsx`): add, publish, hide,
  revert to draft, delete, plus one-click "remove all sample rows". Owner-only
  (`settings:security`); every action is written to the audit trail. Anonymous → 401,
  analyst → 403 (verified).
* **No fabricated endorsements.** Seeded demo rows are named "Sample Persona A/B/C",
  marked `sample: true`, rendered with a gold **Sample** badge, excluded from
  `published` counts, and the page shows an explicit banner explaining that no verified
  testimonial exists yet. Ratings are never inferred; no Review/AggregateRating schema is
  emitted (self-published reviews are not eligible for review rich results anyway).

---

## 3. Environment variables added

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | production | Canonical origin for absolute OG/canonical URLs and every sitemap `<loc>`. |
| `NEXT_PUBLIC_CONTACT_EMAIL` | no | Reply-to address in the footer/privacy/contact pages. |
| `NEXT_PUBLIC_TWITTER_HANDLE` | no | `twitter:site` / `twitter:creator`. |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | no | Enables GA4 (still consent-gated). |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` + `TURNSTILE_SECRET_KEY` | no | Enables the CAPTCHA widget and server verification. Both or neither. |
| `ENFORCE_HTTPS` | no | `true` ⇒ application-level 308 http→https. |
| `CANONICAL_HOST` | no | Apex/www consolidation target. |
| `PUBLIC_PLAYER_PREVIEWS` | no | `false` ⇒ dynamic player cards show branding only. |

All are documented in `.env.example`; none is required for the demo to run.

---

## 4. What still needs a human, a credential or a hosting setting

These are the honest gaps. None of them is claimed as done:

| Item | What is missing | Who can close it |
| --- | --- | --- |
| Real testimonials | Genuine, permission-granted quotes. Demo rows are labelled Sample. | You / the customer |
| Google Analytics data | A GA4 property ID (`NEXT_PUBLIC_GA_MEASUREMENT_ID`) and a looker-side check that events arrive. | You |
| CAPTCHA protection | Cloudflare Turnstile site + secret keys. Until then honeypot/timing/rate limits only. | You |
| HTTPS, HSTS at the edge, clickjacking headers | The hosting control panel (Vercel/Render) — `vercel.json` and `render.yaml` are prepared and documented. | Hosting provider |
| Search Console / Bing Webmaster verification | A verification token and a real domain. Not included. | You |
| Sitemap submission | Ping/search-console submission after the first production deploy. | You |
| Real domain in metadata | `NEXT_PUBLIC_SITE_URL` currently defaults to `http://localhost:3000`. | You |
| Consent banner legal review | The banner is illustrative, not a jurisdiction-specific compliance product. | Legal counsel |
| Durable rate limiting across instances | Current limiter is per-process. A multi-instance deployment needs Redis/Upstash. | You (documented in SECURITY.md) |
| Public report share pages | Not built on purpose (private artefacts). Pattern documented above. | Future work |

---

## 5. Verification evidence (this build)

Run against the production build served by `npm run start` on port 3000:

| Check | Result |
| --- | --- |
| `npx tsc --noEmit` | clean |
| `npx vitest run` | **168 passed** across 10 files (45 new in `tests/growth.test.ts`) |
| `python3 -m pytest -q services/analytics` | 11 passed |
| `node scripts/smoke.mjs` | **58/58 checks passed** |
| `npm run build` | success (34 routes incl. `/sitemap.xml`, `/robots.txt`, OG images, middleware) |
| Public pages `/ /tour /faq /privacy /testimonials /contact /thank-you /login` | 200 (login is `noindex`) |
| Workspace pages (20) authenticated | 200, zero application errors |
| Workspace pages anonymous | 307 → `/login?next=…` |
| Private response headers | `X-Robots-Tag: noindex, nofollow, noarchive` + `noindex` meta |
| `/sitemap.xml` | 6 public URLs, no private prefix |
| `/robots.txt` | private disallows + absolute `Sitemap:` |
| `/opengraph-image` | 200 `image/png`, 1200×630, 144,077 bytes |
| Player share card | 200 `image/png`, 1200×630, 128,550 bytes |
| `/this-page-does-not-exist` | 404 with branded body and navigation |
| Public form: invalid / honeypot / too fast / valid / duplicate / 6th | 422 / 400 / 400 / 201 + `FB-XXXXXX` / 409 / 429 + `Retry-After: 588` |
| `/thank-you` confirmed / failed / empty | correct three-way rendering |
| Testimonials: anonymous GET / anon POST / analyst POST / owner POST | 200 published-only / 401 / 403 / 201 |
| Feedback inbox: anonymous / analyst / owner | 401 / 200 / 200 |
