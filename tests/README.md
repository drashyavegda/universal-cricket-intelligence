# tests/

Top-level test layout for the target monorepo. The **live** suites are at the repository root:
`tests/*.test.ts` (10 files, 151 tests, vitest) and `services/analytics/tests/*` (11 pytest tests).

```
tests/
├── e2e/           browser-level flows (specification; Playwright not yet a dependency)
├── performance/   load/soak definitions (k6 script included, runnable if k6 is installed)
├── security/      manual and semi-automated security checks
└── README.md      this file
```

## The pyramid as it actually is

| Layer | Count | Runs in | Time |
| --- | --- | --- | --- |
| Unit + integration (vitest, in-process route handlers) | 151 tests / 10 files | `npm test` | ~4 s |
| Python service (pytest, httpx ASGI transport) | 15 tests | `cd backend && pytest` | ~0.2 s |
| Smoke (live HTTP) | 58 checks | `npm run smoke` with a server | ~6 s |
| End-to-end (browser) | **not implemented** | — | — |

## Honesty note

There is no browser test suite. The README does not claim one. The smoke suite covers the wire
(status codes, JSON shape, `X-Robots-Tag`, auth redirects) but not rendering, keyboard navigation or
layout. Anything below the wire is verified manually with
[`../docs/testing/MANUAL_QA_CHECKLIST.md`](../docs/testing/MANUAL_QA_CHECKLIST.md).
