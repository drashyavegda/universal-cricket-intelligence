# Security practices

## 1. Authentication

| Control | Implementation | Verification |
| --- | --- | --- |
| Password hashing | scrypt + per-user salt (`lib/core/auth/crypto.ts`) | `tests/auth-security.test.ts` |
| Password policy | min length from settings (10), no plaintext storage or logging | auth test |
| Brute force | 5 failures ⇒ 10-minute lock, audited | auth test |
| 2FA | optional TOTP per user, secret encrypted with `FIELD_ENCRYPTION_KEY` | auth test (TOTP window) |
| Sessions | opaque token, server-side record, 12 h expiry, HttpOnly+SameSite cookie, `Secure` over HTTPS | manual + smoke (`/dashboard` redirect) |
| Session revocation | logout deletes; password change revokes | auth test |

## 2. Authorisation

* Four roles (owner/analyst/scout/viewer) with an explicit permission matrix in
  `lib/core/auth/service.ts`.
* `guard(permission)` is called at the top of every guarded route handler — the *authoritative*
  check, evaluated server-side per request.
* Private pages are also protected by middleware (cookie presence) and by server-side session
  validation in `app/(app)/layout.tsx`.
* Unknown/absent session ⇒ `401`; wrong role ⇒ `403` with the exact permission named.

## 3. Transport & headers

`Strict-Transport-Security` (over TLS) · `X-Content-Type-Options: nosniff` ·
`Referrer-Policy: strict-origin-when-cross-origin` · `Permissions-Policy` disabling camera,
microphone, geolocation, payment, USB · `X-DNS-Prefetch-Control: off` ·
`Cross-Origin-Opener-Policy: same-origin` · `poweredByHeader: false` ·
`X-Robots-Tag: noindex, nofollow, noarchive` on private routes.

IPv4/IPv6: TLS and the HTTP→HTTPS redirect are terminated by Vercel/Render. `ENFORCE_HTTPS=true`
adds an application-level 308 when you front the app yourself.

## 4. Input handling

* Zod schemas at public HTTP boundaries; explicit field rules in
  `lib/core/growth/forms.ts` for the anonymous form.
* Sanitisation strips control characters and zero-width characters, neutralises `<`/`>`,
  collapses whitespace, caps length, rejects 3+ links in a message.
* IDs are looked up, never interpolated into shell/SQL; the JSON store is accessed through typed
  accessors and Postgres uses parameterised queries.
* File uploads: extension/content sniffing, size and row caps; PDFs are parsed for text only.

## 5. Public-form abuse controls

Rate limit (5 / 10 min / IP) → honeypot → timing (≥1.2 s) → optional Turnstile → validation →
duplicate suppression (15 min) → store with a hashed IP hint. Full policy:
[`../../security/SPAM_PROTECTION.md`](../../security/SPAM_PROTECTION.md).

## 6. Secrets

| Rule | Detail |
| --- | --- |
| Server-only | `AI_API_KEY`, `TURNSTILE_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `FIELD_ENCRYPTION_KEY`, `DATABASE_URL`, `ANALYTICS_SERVICE_TOKEN` |
| Never in `NEXT_PUBLIC_*` | those are shipped to the browser |
| Write-only UI | Settings shows `hasApiKey: true/false`, never the value |
| Rotation | rotate on suspicion; revoke sessions by changing the password |
| Scanning | CI secret scan blocks `sk-`, `ghp_`, `AKIA`, `G-` patterns and private keys |

## 7. Audit trail

Append-only entries: `login`, `login_failed`, `login_failed_2fa`, `logout`, `register`, `2fa_enabled`,
`2fa_disabled`, `password_changed`, `dataset_approved`, `feedback_submitted`, `feedback_status`,
`testimonial_created/updated/deleted/samples_purged`, `report_generated`, `export`,
`workflow_run`, `settings_changed`. Actor, timestamp, entity, entity id, detail, IP.
Catalogue: [`../../security/AUDIT_EVENTS.md`](../../security/AUDIT_EVENTS.md).

## 8. Data protection

* Confidential data (uploads, reports, shortlists) is session- and role-gated and `noindex`.
* Share cards show only name/role/team/format; `PUBLIC_PLAYER_PREVIEWS=false` removes names for
  real data.
* Object storage buckets must be **private** with signed URLs (phase 3).
* Backups are the provider's responsibility; the app documents how to take your own.
* No analytics payload contains player names, emails, file names or message bodies.

## 9. AI-specific controls

Untrusted uploaded text is never treated as instructions; write intents require explicit
confirmation; only the evidence block is sent to the provider; budget and rate limits are
enforced and logged. Detail: [`../architecture/AI_LAYER_CONTRACT.md`](../architecture/AI_LAYER_CONTRACT.md).

## 10. Dependency and supply chain

* Minimal dependency surface (16 runtime packages), pinned versions, committed lockfile.
* `npm ci` in CI; `npm audit` in the security workflow; Python requirements pinned.
* No postinstall scripts allowed without review.
