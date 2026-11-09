# Security

This document describes what the code actually does. It is an engineering description, **not** a
certification, audit result or penetration test. `/settings → Security posture` shows the same
control list with its honest gaps.

## Authentication

| Control | Implementation |
| --- | --- |
| Password hashing | `scrypt` (N=16384, r=8, p=1) with a 16-byte random salt per user, 64-byte derived key, constant-time comparison (`lib/core/auth/crypto.ts`). |
| Sessions | Opaque 256-bit random token in an `httpOnly`, `SameSite=Lax` cookie (`ucip_session`), server-side record with expiry (default 12 h) and revocation. |
| Two-factor | RFC 6238 TOTP implemented locally (HMAC-SHA1, 30 s step, ±1 window). The shared secret is stored AES-256-GCM encrypted via `encryptField`/`decryptField`. |
| Lockout | 5 failed attempts ⇒ 10-minute lock, recorded on the user record. |
| Rate limiting | Sliding window per key (IP + route) on login, AI and upload paths. In-process only — see “Known gaps”. |

## Authorisation

`guard(permission)` runs at the top of every data-bearing route handler:

```ts
const g = guard('analysis:run');
if (!g.ok) return g.response;   // 401 AUTH_REQUIRED or 403 FORBIDDEN
```

Four roles, explicit permission lists, no implicit inheritance (`lib/core/auth/service.ts`).
Highlights:

- `viewer` can read only. Every route that exposes workspace data requires at least `view`.
- `scout` can run analyses and write shortlists but cannot approve data or touch settings.
- Only `owner` can approve a dataset (the action that promotes rows into the analytical store)
  and change AI/security settings.
- `/api/health` and `/api/auth/login` are the only unauthenticated endpoints.

## Data protection

- Secrets are read from the server environment only. There is no UI field that accepts an API key,
  no key is ever returned in a response, and the audit log records *that* settings changed, not
  the values.
- `FIELD_ENCRYPTION_KEY` drives AES-256-GCM field encryption for 2FA secrets (random 12-byte IV per
  call, auth tag verified on decrypt, so tampering is detected).
- Uploads: size limit (25 MB default), row limit (50 000), server-side parsing only, SHA-256
  hashing, duplicate detection, no shell execution, no path from upload to filesystem writes.
- Multi-tenant isolation is expressed in `db/migrations/0001_init.sql` as RLS policies that fail
  closed when `app.organisation_id` is unset.
- `audit_log` is append-only (trigger rejects UPDATE/DELETE) and capped in the demo store.

## AI-specific controls

| Risk | Mitigation |
| --- | --- |
| Model invents statistics | The model only receives computed numbers and is instructed to rephrase only; the evidence block shown next to every answer comes from the engine, not the model. |
| Prompt injection via uploaded text | `guardPrompt()` neutralises instruction-override patterns and redacts key-like strings before any model call; the guarded text is what gets sent. |
| Hidden cost | Per-call token accounting, monthly budget with a hard stop, per-minute rate limit; demo mode records `usd: 0`. |
| Unauthorised actions by an agent | Agents hold read-only scopes; any write step is an explicit human approval gate with the approver recorded. |
| Data exfiltration through prompts | Prompts contain the computed aggregates needed for narration, never whole datasets or credentials. |
| Assistant performing writes | Write-style verbs are parsed into a `write_action` intent that requires explicit confirmation and performs nothing itself. |

## Known gaps (stated, not hidden)

1. **Rate limiting is per process.** With more than one instance, move the bucket to Redis.
2. **No independent penetration test** has been performed.
3. **No dependency scanner run in CI** by default (`npm audit` / `pip-audit` are left to you).
4. **OAuth is a stub.** `GOOGLE_CLIENT_ID`/`SECRET` are listed in `.env.example` but the flow is not
   implemented; enabling it requires completing the adapter.
5. **TLS termination is the deployment's job.** Run behind a TLS-terminating proxy; the app sets
   `Secure` cookies automatically when `NODE_ENV=production`.
6. **File storage.** Uploaded bytes are parsed in memory in the demo build; production should put
   originals in object storage and keep only the pointer (`dataset_files.object_key` already exists).
7. **No certification is claimed.** The posture score is a self-assessment of implemented controls.

## Hardening checklist before a real deployment

- [ ] Rotate the four demo accounts or delete them.
- [ ] Set `FIELD_ENCRYPTION_KEY` to 32+ random bytes and store it in a secret manager.
- [ ] Set `NODE_ENV=production` (enables `Secure` cookies) and terminate TLS in front of the app.
- [ ] Move to PostgreSQL with a dedicated role that has no DDL rights, and confirm RLS is forced.
- [ ] Restrict `audit_log` grants to INSERT/SELECT for the application role.
- [ ] Put an external rate limiter / WAF in front of `/api/auth/login`.
- [ ] Run `npm audit` and `pip-audit`, and fix or document every finding.
- [ ] Configure backups (`pg_dump` schedule) and rehearse a restore.
- [ ] Commission an independent penetration test before handling personal data at scale.

## Web-surface hardening (quality, SEO & trust module)

### Route protection
| Surface | Gate |
| --- | --- |
| `/dashboard`, `/data`, `/players`, `/talent`, `/compare`, `/stats`, `/team`, `/xi`, `/auction`, `/match`, `/pitch`, `/opposition`, `/prediction`, `/scouting`, `/workload`, `/research`, `/assistant`, `/automation`, `/reports`, `/settings` | `middleware.ts` redirects without a session cookie (307 → `/login?next=…`); `app/(app)/layout.tsx` then validates the token server-side before rendering (defence in depth). |
| `/api/**` | Per-route `guard(permission)`; unauthenticated calls return `401` JSON rather than an HTML redirect. |
| `/api/health`, `/api/auth/login`, `/api/auth/me`, `/api/public/feedback`, `GET /api/testimonials`, `/sitemap.xml`, `/robots.txt`, OG images | Public by design. |
| Everything else (FAQ, privacy, testimonials, contact, thank-you, 404) | Public, but carries no workspace data and is excluded from authenticated fetches. |

### Indexing controls
`robots.txt` disallows all workspace prefixes, `/api/`, `/login`, `/thank-you`; private
routes additionally emit `<meta name="robots" content="noindex, nofollow">` and an
`X-Robots-Tag: noindex, nofollow, noarchive` response header, so a leaked link still cannot
be indexed. `/login` and `/thank-you` are `noindex` but remain crawlable-friendly enough to
render. The sitemap generator can only ever read a hard-coded list of public pages.

### Response headers
`Strict-Transport-Security` (over HTTPS), `X-Content-Type-Options: nosniff`,
`Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` disabling camera,
microphone, geolocation, payment and USB, `X-DNS-Prefetch-Control: off`,
`Cross-Origin-Opener-Policy: same-origin`, `poweredByHeader: false`.

**Known gap (deliberate, documented):** `X-Frame-Options` and CSP `frame-ancestors` are not
set by the app because the hosting preview embeds it in an iframe. `vercel.json` sets
`X-Frame-Options: SAMEORIGIN` for production; if you deploy elsewhere, set it at your proxy.

**Known gap (deliberate, documented):** there is no full `Content-Security-Policy` yet —
adding one requires auditing the inline styles produced by Tailwind/Recharts and the GA4
snippet. A strict CSP is a follow-up item, not something this build claims.

### Public form controls
Rate limit (5 / 10 min / IP, `429` + `Retry-After`), honeypot field, minimum fill time
(1.2 s), optional Cloudflare Turnstile verification, server-side validation and
sanitisation (control + zero-width characters stripped, `<`/`>` neutralised, 3+ links
rejected), 15-minute duplicate suppression, and a stored `ipHint` that is a SHA-256 prefix
rather than the raw address. The limiter is per process — a multi-instance deployment needs
a shared store (Redis/Upstash) — this is stated in the UI copy, the privacy policy and here.

### Analytics privacy
No analytics script is requested unless `NEXT_PUBLIC_GA_MEASUREMENT_ID` is set **and** the
visitor accepts the consent banner (Do Not Track counts as a decline). Event payloads pass
through a 14-key allowlist; numeric counts are bucketed; player names, emails, file names
and message bodies are never part of the schema.
