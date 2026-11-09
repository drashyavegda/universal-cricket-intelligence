# Rate limiting

## What exists today

| Surface | Limit | Window | Key | Where |
| --- | --- | --- | --- | --- |
| `POST /api/public/feedback` | 5 submissions | 10 min | hashed IP + topic | `lib/core/growth/forms.ts` |
| Login failures | 5 attempts | 15 min | hashed email + IP | `lib/core/auth/service.ts` |
| Dataset upload | 6 uploads | 10 min | session user | `app/api/upload/route.ts` |
| Report generation | 20 | 10 min | session user | `app/api/reports/route.ts` |
| AI narration | budget-capped (USD) | monthly | workspace | `lib/core/ai/gateway.ts` |

## Implementation notes

* Counters live in the JSON store under `rateLimits`, keyed by `scope:identifier`, with a sliding
  window (timestamps array). No external dependency, no Redis requirement.
* Keys are **hashed** (SHA-256 + per-install salt) so a leaked store cannot be turned into an IP list.
* The limiter is per process. With more than one instance, each instance keeps its own count.

## Known gap (documented, not hidden)

> There is **no global rate limiter** in `middleware.ts`. An unauthenticated attacker can hammer any
> API route and be bounded only by the host platform (Vercel/Render request limits) and by the
> per-endpoint limits above. This is acceptable for a demo deployment behind a host-level limiter, and
> is listed as a phase-4 item in `../docs/security/KNOWN_GAPS.md`.

Phase 4: move counters to Postgres (`rate_limit_buckets` table, one row per key/window) or to the
host edge, and add a middleware-level limit of 120 requests/minute/IP with a 429 envelope identical to
the API's error shape.

## Response shape

```
HTTP/1.1 429 Too Many Requests
Retry-After: 372
{ "error": "Too many submissions from this network. Please try again shortly.",
  "code": "RATE_LIMITED", "retryAfterSeconds": 372 }
```

Never a bare 429: the client must be able to show a human message and a countdown.
