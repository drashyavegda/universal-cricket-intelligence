# tests/performance/

Load and soak definitions. `load.k6.js` is a real k6 script — runnable if you install k6 locally; it is
not part of CI because a free-tier deployment cannot absorb a load test.

## Thresholds we hold ourselves to

| Endpoint | p95 target | Notes |
| --- | --- | --- |
| `GET /` (static) | < 300 ms | server-rendered landing |
| `GET /api/health` | < 150 ms | store open only, no third party |
| `POST /api/talent` | < 1200 ms | 190 players ranked |
| `POST /api/reports` + export PDF | < 4000 ms | largest single request in the product |

## Run

```bash
k6 run tests/performance/load.k6.js                          # default: 10 VUs, 30 s, public pages
BASE_URL=http://localhost:3000 k6 run -e SCENARIO=api tests/performance/load.k6.js
```

## Interpretation rules

1. A cold start on a free host is not a performance regression — measure after a warm-up.
2. Never load-test production. Use a local or staging instance; the JSON store rewrites a single file
   and concurrent writes are not the product's design.
3. Record the run (date, commit, instance size) in the release notes if a threshold changed.
