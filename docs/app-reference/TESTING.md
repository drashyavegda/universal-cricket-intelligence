# Testing

Everything below was **actually executed** in the build environment that produced this repository.
No results are aspirational.

## Summary

| Suite | Command | Result |
| --- | --- | --- |
| TypeScript unit/integration (Vitest) | `npm test` | **151 passed / 151**, 10 files, ~13 s |
| Python analytics (pytest) | `npm run test:py` | **11 passed / 11**, ~0.4 s |
| Type check (strict) | `npm run typecheck` | **clean**, 0 errors |
| End-to-end API smoke (live server) | `npm run smoke` | **58 / 58 checks passed** |
| Export integrity | part of smoke | PDF, DOCX, XLSX, PPTX, MD, HTML all generated and inspected |

## What the TypeScript suite covers

| File | Tests | Focus |
| --- | --- | --- |
| `tests/stats.test.ts` | 17 | mean/median/sample-sd by hand, null for single observations, percentile clamping, CI widening, Wilson interval bounds, Spearman on a monotone transform, moving-average warm-up, IQR outlier flagging, OLS recovering `y=3x+1`, z-scores/normalisation, Poisson pmf summing to 1, Brier score hand-check |
| `tests/ranking.test.ts` | 11 | determinism, **no imputation** (missing metric ⇒ null percentile, contribution 0, coverage < 1), score bounds, strict age filters, percentile recomputation inside filtered cohort, sensitivity report, every preset metric exists, age headroom bounds/monotonicity, metric-rate denominators |
| `tests/data.test.ts` | 16 | messy-header mapping, unmappable headers left unmapped, number/date/boolean parsing, impossible dates rejected (no `31/02` rollover, no `10/02/2006 → 2011` bug), age derivation, unknown columns preserved, missing-name error, implausible values, confidence ordering, cross-dataset identity matching, conflict detection beyond tolerance |
| `tests/promote.test.ts` | 7 | only approved rows promoted, unique ids, rows without name/figures skipped, DEMO placeholder replaced rather than duplicated, idempotency, explanatory reasons, free-text role normalisation |
| `tests/valuation.test.ts` | 8 | fair value > 0, ordered bid ceilings, band contains fair value, caveats always present, stronger player valued higher, monotonic in need/scarcity, determinism, scarcity bounded 0–1, team need returns a reason |
| `tests/xi-sim.test.ts` | 9 | 11 players always, overseas/keeper/bowling-plan constraints, no duplicates, 20-over plan uses ≥5 bowlers with ≤4 overs each, determinism independent of requested flavours, strict overseas limit, win probabilities sum to 1, seeded reproducibility, ordered quantiles, Brier/log-loss scoring on stored fixtures |
| `tests/auth-security.test.ts` | 12 | scrypt salting + verification, password never stored in the hash record, TOTP window, AES-GCM round-trip + tamper detection, constant-time compare, RBAC matrix, rate-limit block, security posture honesty (score < 100, pen-test marked unimplemented, disclaimer wording) |
| `tests/assistant-reporting.test.ts` | 15 | intent/role/age extraction (EN/HI/GU), no invented player names, write-intent parsing, evidence non-empty, confirmation required for consequential actions, prompt-injection redaction, demo-mode fallback labelled, report sections/sources/quality, unknown venue throws, knowledge retrieval with citations, gibberish returns nothing |
| `tests/growth.test.ts` | 45 | sanitisation, validation, rate limiting, CAPTCHA skip/fail, feedback pipeline, testimonials CRUD + permissions, SEO registry uniqueness/lengths/sitemap exclusion, FAQ & tour content, edge security helpers, analytics consent/allowlist |
| `tests/team-intel.test.ts` | 11 | squad depth + weaknesses, recommendation priorities, opposition report shape and “inference not inside knowledge” caveat, pitch evidence tags, toss decision/confidence/caveat, workload never diagnoses, acute:chronic null when chronic missing, discovery verification statuses, risk bounds, trajectory refuses to forecast without a season series |

## Python suite (`services/analytics/tests/test_compute.py`)

11 tests: describe vs hand calculation, empty input rejection, missing values dropped, perfect
correlation, paired-length validation, regression line recovery, IQR outlier flagging, moving
average window, percentile ranks excluding missing values, weighted score coverage rescaling, and
weights required.

## Smoke test

`scripts/smoke.mjs` boots against a running server and walks the real HTTP surface:
health → login → 11 read endpoints → talent → compare → predict (with real team ids) → pitch →
opposition → assistant → assistant write-gate → report generation → six export formats →
three unauthenticated 401 checks.

```
$ npm run smoke
PASS  GET /api/health — mode demo
PASS  POST /api/auth/login — role owner
...
PASS  unauthenticated /api/audit rejected — 401

31/31 checks passed
```

## Bugs this suite actually caught (fixed, not hidden)

1. `parseDate` added 2000 to the **day** when the first group was < 100, so `10/02/2006` became
   `2011-08-03`. Rewritten with component validation; `31/02/2005` is now rejected instead of
   rolling over.
2. Column mapping matched `Zebra`→runs and `Trial notes`→innings because one-letter synonyms were
   containment-matched. Fixed with a minimum-length rule plus an explicit single-typo allowance
   (`Wckts` → wickets, confidence 0.7).
3. A record with implausible values scored *higher* confidence than a clean record because it filled
   more cells. Penalty weights rebalanced (error 0.20, warn 0.08).
4. Promotion assigned the same player id to every promoted row. Ids now derive from row + record and
   are de-duplicated against the store.
5. Promotion read nested `batting.*` fields that the extractor never produces, so every uploaded
   player arrived with zero runs. Now reads the flat canonical fields.
6. `evaluatePredictionQuality` split teams by slicing the scorecard, which mixed the sides and
   produced `n = 0`. Now splits by innings from the ball-by-ball events.
7. The assistant answered “save the shortlist” as a read-only ranking because `list` matched inside
   `shortlist`. A `write_action` intent now gates every write verb behind confirmation.
8. Every read route was reachable unauthenticated (`/api/settings` returned 200 to guests). All
   data-bearing handlers now call `guard('view')`; `/api/health` and login stay public.
9. `docx` and `xlsx` exports were offered in the UI but the route returned 400. Both are now
   implemented and verified.
10. `decryptField` and `safeEqual` were missing although encryption existed — added so encrypted
    2FA secrets can actually be read back.

## Not covered (deliberately)

- No browser/E2E framework (Playwright) is bundled: the UI is exercised through the HTTP smoke test
  plus server-rendered page checks for all 22 routes. Add Playwright if you need click-path tests.
- No load testing. Simulation cost is bounded by `simulations ≤ 20 000` in the API.
- No tests against a live PostgreSQL instance in this build; the migration is syntactically
  validated and reviewed but not executed here.

## Website quality, SEO, trust & growth — test coverage

| Layer | What it proves | Command |
| --- | --- | --- |
| Unit (`tests/growth.test.ts`, 45 tests) | sanitisation, email normalisation, link-spam detection, IP hashing, reference format, fingerprinting, server-side validation (all four error paths), rate-limit burst/block/window-expiry/key isolation, CAPTCHA skip and fail-closed behaviour, the full feedback pipeline (success, honeypot, too-fast, invalid, duplicate, 6th-message 429, status changes), testimonial validation/creation/dedupe/update/delete/purge, SEO registry uniqueness + length limits + sitemap exclusion, FAQ and tour content integrity, edge security helpers (path classification, session requirement, HTTPS and canonical-host decisions, header set), analytics consent/bucket/allowlist | `npx vitest run` |
| End-to-end (`scripts/smoke.mjs`, 58 checks) | 8 public pages 200, workspace pages 200 authenticated / 307 anonymous, root metadata, OG/Twitter tags with 1200×630 dimensions, security headers, default share image is a real PNG >10 KB, FAQ JSON-LD, sitemap public-only, robots.txt disallow + sitemap line, custom 404, `X-Robots-Tag` on private routes, form rejection paths, thank-you three-way states, testimonial permissions (401/403/201), feedback inbox | `node scripts/smoke.mjs` |
| Manual, browser | consent banner (allow/decline/dismiss), GA4 request only after consent, mobile navigation on the public site, 404 recovery links, contact form keyboard order, testimonials badge rendering, Settings → Growth & trust CRUD | manual |

### Manual verification log (what was actually executed)
1. `curl /opengraph-image` → `image/png`, 1200×630, 144,077 bytes; image opened and
   inspected visually.
2. Player card for a seeded record → `image/png`, 1200×630, 128,550 bytes; inspected.
3. Player page `<title>` → `"Aarav Chatterjee — Middle-order Batter Analytics Profile"`,
   robots `noindex`, `X-Robots-Tag` present.
4. `/login` title → `"Sign In · UCIP"` after adding `app/login/layout.tsx` (client components
   cannot export metadata — caught by this check, then fixed and re-verified).
5. `/this-page-does-not-exist` → 404 with the branded body.
6. `/thank-you?ref=FB-C4E6F7` → confirmation; `/thank-you` → "Nothing to confirm yet";
   `/thank-you?status=failed` → failure state. No success is shown without a valid reference.
7. Sixth message from one IP → `429` with `Retry-After: 588`.
8. Analyst session on `POST /api/testimonials` → `403`; owner → `201`.
9. All twenty workspace pages fetched with a session → 200, zero "Application error".

### Regression note
The dashboard moved from `/` to `/dashboard`, and `/` is now the public landing page.
Everything else (APIs, exports, AI assistant, auction, uploads) was re-verified unchanged.
