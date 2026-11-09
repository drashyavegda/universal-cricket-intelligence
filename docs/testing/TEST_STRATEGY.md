# Test strategy

## 1. Pyramid (as implemented)

```
        ┌───────────────────────────┐
        │ smoke (58 checks)         │  scripts/smoke.mjs — live production build
        ├───────────────────────────┤
        │ integration (API routes)  │  vitest, in-process route handlers + store
        ├───────────────────────────┤
        │ unit (engines, helpers)   │  vitest (151) + pytest (11)
        └───────────────────────────┘
```

| Layer | Tool | Location | Count | Runtime |
| --- | --- | --- | --- | --- |
| Unit / integration (TS) | Vitest 2.1 | `tests/*.test.ts` (10 files) | 151 | ~13 s |
| Python compute | pytest 8.3 | `services/analytics/tests/` | 11 | ~0.1 s |
| End-to-end API + page | Node script | `scripts/smoke.mjs` | 58 | ~2 s |
| Type safety | tsc strict | whole project | 0 errors | ~8 s |
| Build | next build | whole project | 34 routes + middleware | ~35 s |

## 2. What each suite protects

| Suite | Guarantees |
| --- | --- |
| `stats.test.ts` (17) | hand-checked mean/median/sd, CI widening, Wilson bounds, Spearman, OLS recovery, IQR outliers, Poisson pmf, Brier score |
| `ranking.test.ts` (11) | determinism, no imputation, coverage shrinkage, strict age filters, preset integrity, headroom bounds |
| `data.test.ts` (16) | messy headers, impossible dates rejected, unknown columns preserved, confidence ordering, merge conflicts |
| `promote.test.ts` (7) | only approved rows promote, idempotency, DEMO placeholder replaced |
| `valuation.test.ts` (8) | ordered ceilings, band contains fair value, monotonic scarcity/need, caveats |
| `xi-sim.test.ts` (9) | XI legality, bowling-plan coverage, probabilities sum to 1, seeded reproducibility, calibration metrics |
| `auth-security.test.ts` (12) | scrypt, TOTP, AES-GCM tamper detection, RBAC matrix, lockout, posture honesty |
| `assistant-reporting.test.ts` (15) | intent parsing, no invented players, write-intent gating, injection redaction, report structure |
| `team-intel.test.ts` (11) | squad/opposition/pitch/workload/trajectory honesty (nulls, not fabrications) |
| `growth.test.ts` (45) | sanitisation, validation, rate limits, CAPTCHA, feedback pipeline, testimonials CRUD, SEO registry, edge security, analytics privacy |
| `smoke.mjs` (58) | pages 200/307, exports (6 formats), 401s, metadata, OG image bytes, sitemap, robots, 404, form paths, thank-you states, testimonial permissions, feedback inbox |
| pytest (11) | Python compute parity for descriptive stats, correlation, regression, histogram |

## 3. Rules

1. **A bug fix ships with a failing test first.** Ten real bugs were found this way (documented
   in the app's `docs/TESTING.md`).
2. **Honesty tests are mandatory.** Assertions like "trajectory without a season series returns
   zero forecasts" prevent fabricated output from creeping back in.
3. **No test touches real data or the network.** `tests/setup.ts` redirects `DATA_DIR` to a temp
   folder; the AI gateway is not called in tests.
4. **Smoke runs against a production build**, not `next dev`.

## 4. Commands

```bash
npm run typecheck          # tsc --noEmit
npm test                   # vitest run
npm run test:py            # backend/ (phase 2)
npm run test:analytics     # services/analytics
npm run build              # production build
npm run seed && npm start &   # then:
npm run smoke              # 58 checks against localhost:3000
```

CI (`.github/workflows/ci.yml`) runs typecheck → vitest → pytest → build on every push.

## 5. Not yet covered (honest)

| Area | Status | Plan |
| --- | --- | --- |
| Browser e2e (Playwright) | not written | `tests/e2e/README.md` describes the first five flows |
| Load/performance (k6) | not written | `tests/performance/README.md` targets p95 < 800 ms for analytics endpoints |
| Accessibility (axe) | manual only | add `@axe-core/playwright` in phase 3 |
| Security scanning (ZAP) | not run | `tests/security/README.md` lists the checks |
| Visual regression | none | optional (chromatic or Playwright snapshots) |
| Postgres parity | not possible yet | required in phase 3 |
