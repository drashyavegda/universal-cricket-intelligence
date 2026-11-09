# Testing documentation

| Document | Contents |
| --- | --- |
| [TEST_STRATEGY.md](TEST_STRATEGY.md) | Pyramid, what each layer covers, how to run, current numbers |
| [MANUAL_QA_CHECKLIST.md](MANUAL_QA_CHECKLIST.md) | Browser checks that automation cannot cover |

Test code lives in the application repository (`tests/*.test.ts`, `services/analytics/tests/`,
`scripts/smoke.mjs`). The [`../../tests/`](../../tests/) folder in this package adds the
organisation taxonomy and plans for e2e/performance/security layers that are not written yet.
