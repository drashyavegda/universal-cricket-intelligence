# Error envelope and codes

## Envelope

Guarded API routes return one of two shapes:

```jsonc
{ "error": "human readable message", "code": "MACHINE_CODE", "…extra" }
{ "ok": false, "reason": "validation", "errors": { "field": "message" }, "checks": ["…"] }
```

The public form adds `reason` and `checks` so a rejection is explainable. Pages use the same
messages; nothing throws raw stack traces to the client (`serverError()` logs and returns a
generic message).

## HTTP status mapping

| Status | When | Typical `code` |
| --- | --- | --- |
| 200 | read/write success | — |
| 201 | created (report, feedback, testimonial) | — |
| 307 | middleware redirect to `/login` (workspace page, no cookie) | — |
| 400 | malformed body, missing required param, spam rejection | `BAD_REQUEST`, `spam` |
| 401 | no/invalid session | `AUTH_REQUIRED` |
| 403 | session valid, role insufficient | `FORBIDDEN` |
| 404 | unknown id/route | `NOT_FOUND` |
| 409 | duplicate submission | `duplicate` |
| 422 | field validation failed | `validation` |
| 423 | account locked after failed logins | `LOCKED` |
| 429 | rate limited (AI, login, public form) | `RATE_LIMITED`, `rate_limited` |
| 500 | unexpected server error (logged) | `SERVER_ERROR` |

## Catalogue of messages users actually see

| Message | Cause | Fix |
| --- | --- | --- |
| `Sign in required for this action.` | no session cookie | sign in; the demo accounts are on `/login` |
| `Your role (scout) lacks the "data:approve" permission.` | RBAC | ask an owner/analyst; roles are listed in Settings |
| `Please correct the highlighted fields.` | validation | see `errors{}` |
| `Too many messages from this network. Please wait and try again.` | form rate limit (5/10 min) | wait, or email directly — nothing was lost |
| `This submission was rejected by the spam filter.` | honeypot / instant submit | disable autofill of hidden fields; email directly if genuine |
| `This message was already received.` | duplicate within 15 min | check the thank-you reference |
| `CAPTCHA verification failed. Please retry.` | Turnstile rejected | retry the challenge |
| `Two-factor code required.` | 2FA enabled | enter TOTP |
| `Account locked for 10 minutes.` | 5 failed logins | wait or ask an owner to unlock |
| `Report not found` / `Dataset not found` | stale id | re-open from the list |
| `Unknown venue` | bad venue id in a report request | pick a venue from `/api/venues` |
| `Analytics service unreachable` | optional Python service down | the app still computes locally; check the service |

## Client handling rules

1. Show the message; never a generic "something went wrong" when a typed message exists.
2. Never render success UI on a non-2xx response (enforced in the contact form and report flow).
3. On `401`, redirect to `/login?next=<current path>`.
4. On `429`, honour `Retry-After` and keep the user's input.
5. On `422`, focus the first field in `errors`.
