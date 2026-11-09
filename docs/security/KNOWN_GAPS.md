# Known gaps (stated plainly)

Everything below is *not* implemented. Each entry lists the mitigation in place today and the
phase that closes it. Do not describe the platform as "fully secure" or "certified" while these
are open.

| # | Gap | Risk | Mitigation today | Close in |
| --- | --- | --- | --- | --- |
| 1 | No Content-Security-Policy | XSS impact not constrained | React escaping, no `dangerouslySetInnerHTML` except JSON-LD, sanitiser on forms | Phase 3 (needs Tailwind/Recharts inline-style audit) |
| 2 | `X-Frame-Options` not set by the app | Clickjacking | `vercel.json` sets `SAMEORIGIN`; hosting preview iframe intentionally allowed | Phase 2 (set at the proxy for every host) |
| 3 | Rate limiting is per process | Bypass across instances | Generous windows + audit of submissions | Phase 4 (Redis/Upstash shared limiter) |
| 4 | JSON store is not transactional | Partial writes on crash | Atomic tmp-file rename on persist | Phase 3 (Postgres) |
| 5 | RLS present in SQL but unused by the JSON path | Multi-tenancy not enforced | Single-organisation deployment assumption, documented | Phase 3 |
| 6 | No SSO/SAML/OIDC | Password-only identity | scrypt + optional TOTP + lockout | Later (adapter stub exists, refuses to claim it works) |
| 7 | No WORM/immutable audit storage | Insider could alter audit | App-level append-only + caps | Phase 3 (DB trigger/export) |
| 8 | Uploads stored on local disk | Not durable on serverless | Documented; Postgres+storage in phase 3 | Phase 3 |
| 9 | No antivirus/content scanning on uploads | Malicious file stored | Parsers only accept known formats; files never executed | Phase 3 (optional scanner) |
| 10 | No OCR for scanned PDFs | Rejects image-only PDFs | Explicit error message and FAQ entry | Out of scope |
| 11 | No SBOM or signed releases | Supply-chain visibility | Pinned deps + audit in CI | Phase 4 |
| 12 | No penetration test | Unknown unknowns | Internal threat model + tests | Before customer-facing launch |
| 13 | Testimonials lack real names | Trust gap (not a security gap) | Sample rows labelled, page states the truth | Content task |
| 14 | Edge TLS/HSTS/backups are provider settings | Depends on operator | Configs + checklists provided | Deployment task |

## Standing statements (safe to quote)

* "Passwords are hashed with scrypt and never stored in plain text."
* "Private workspace pages are session-gated and excluded from search indexing."
* "Public forms are protected by server-side validation, per-IP rate limiting, honeypot and
  duplicate suppression; CAPTCHA is available when configured."
* "No analytics data leaves the browser unless the visitor consents."
* "We make no security certification claims."

## Statements that would be false

* "Encrypted at rest end-to-end" (only the 2FA secret field is encrypted by the app).
* "GDPR/ISO/SOC compliant".
* "Rate limited globally across all instances".
* "Immutable, tamper-proof audit log".
