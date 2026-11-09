# tests/security/

Security verification that a unit test cannot express. Semi-automated where possible, explicitly manual
where not — and honest about which is which.

## Automated (in CI)

`../../.github/workflows/security.yml` runs on every push:
1. secret pattern scan (same patterns as `scripts/verify.sh`),
2. `npm audit --omit=dev --audit-level=high` (fails on high/critical; a known low advisory does not
   block a release but is listed in the PR),
3. a grep gate proving no wildcard CORS allow-list in Python, and no `NEXT_PUBLIC_` variable whose
   name implies a secret (`SECRET`/`TOKEN`/`PASSWORD`/`_KEY`, excluding the deliberately public
   Turnstile site key, Supabase anon key and GA4 measurement id),
4. a grep gate proving every `app/api/**/route.ts` that mutates state calls `guard(` or `requireUser(`.

## Manual checklist (before each release)

| Check | How | Pass |
| --- | --- | --- |
| Workspace gated | `curl -sI /dashboard` while signed out | 307 to `/login`; no data in the body |
| Noindex on private routes | `curl -sI /players` signed in | `X-Robots-Tag` contains `noindex` |
| Robots excludes workspace | `curl -s /robots.txt` | `Disallow: /dashboard` etc. present |
| Sitemap is public only | `curl -s /sitemap.xml` | exactly 6 URLs, none behind auth |
| Session cookie flags | devtools → cookies | `HttpOnly`, `SameSite=Lax`, `Secure` in production |
| Replay a stale session | sign out, then reuse the old cookie | 401, not a redirect loop |
| Rate limiter | submit the contact form 6× quickly | 6th is rejected with `Retry-After` |
| Honeypot | submit with `company_website` filled | success-shaped response, nothing stored |
| Upload limits | upload a 30 MB file | rejected with a clear message, no partial rows |
| Error envelope | request `/api/players/does-not-exist` | `404` JSON envelope, no stack trace |
| CSV formula injection | upload a cell starting `=` | treated as text, never evaluated |
| Export filename | export a PDF with `../` in the report title | filename is generated server-side |

## Known gaps (see `../../docs/security/KNOWN_GAPS.md`)

No CSP, no global rate limiter, no RLS policies in SQL, no automated dependency-update cadence. These
are documented rather than pretended away — a security page that lists only strengths is not a security
review.
