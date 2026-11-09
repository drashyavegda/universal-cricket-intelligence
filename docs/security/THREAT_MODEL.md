# Threat model

Scope: the deployed web application (Next.js on Vercel), the optional FastAPI service on Render,
PostgreSQL/Supabase and object storage. Method: assets → actors → STRIDE-style analysis →
mitigation → residual risk.

## 1. Assets

| Asset | Sensitivity | Where |
| --- | --- | --- |
| Uploaded competition datasets | Confidential | `DATA_DIR` / Postgres / object storage |
| Player performance metrics and reports | Confidential | store + generated files |
| User credentials | Secret | hashed in store/DB |
| Session tokens | Secret | HttpOnly cookie + server record |
| AI provider key, DB URL, service token | Secret | server env |
| Public content (FAQ, privacy, tour) | Public | code |

## 2. Actors

Anonymous visitor · authenticated viewer/scout/analyst · owner/admin · malicious scraper or
spammer · compromised dependency · insider with a valid account · optional AI provider.

## 3. Analysis

| Threat | Vector | Mitigation (implemented) | Residual |
| --- | --- | --- | --- |
| **S**poofing | credential stuffing, session theft | scrypt, lockout, HttpOnly/SameSite/Secure cookie, 12 h expiry, optional 2FA | no MFA enforcement for admins by default (setting exists) |
| **T**ampering | editing records to fake performance | RBAC on writes, per-record version, audit trail, approval gate before analytics | an owner can still edit; the audit records it |
| **R**epudiation | "I didn't approve that" | append-only audit with actor + entity + detail | audit is application-level (not WORM storage) |
| **I**nformation disclosure | private dashboards indexed or leaked | session gate, `noindex` meta + `X-Robots-Tag`, robots disallow, sitemap excludes private paths, share cards limited | a user with a valid account can screenshot anything |
| **D**enial of service | form flooding, AI cost abuse | rate limits (form, login, AI), body/row caps, budget hard stop, upload limits | per-process limiter, no WAF by default |
| **E**levation of privilege | scout attempting approval | permission matrix checked per request; role claims only from the session record | misconfigured role assignment by an owner |
| Prompt injection | malicious text in an uploaded PDF/knowledge doc | untrusted-content treatment, injection guard, write confirmation, evidence-only narration | novel phrasing could still produce odd prose (never a write) |
| Path traversal / SSRF | crafted filenames or URLs | filenames sanitised; no user-supplied URL is fetched server-side | none known |
| Supply chain | malicious npm/pip package | pinned deps, lockfile, `npm ci`, audit in CI, minimal surface | no SBOM/signing yet |
| Data loss | disk/DB failure | daily dumps (`scripts/maintenance/backup.sh`), provider backups | restore drill is manual |
| Model/provider outage | AI unavailable | deterministic fallback always available | degraded narration only |
| CORS misconfiguration | API called from arbitrary origin | exact-origin allow-list, credentials disabled for wildcards | operator must keep the list accurate |

## 4. Trust boundaries

1. Internet → Vercel edge (TLS, middleware) — untrusted input enters here.
2. Vercel → Postgres/Storage — credentials must be server-side only.
3. Vercel → Render API — shared bearer token; the service must not be publicly usable without it.
4. App → AI provider — only evidence blocks leave the perimeter.

## 5. Out of scope

Physical security, cloud provider internals, browser extension attacks, DDoS beyond provider
defaults, social engineering, and legal compliance certification.

## 6. Residual risk statement (plain language)

An authenticated insider can read anything their role permits; that is by design. Anonymous
visitors cannot read any workspace data, and search engines cannot index it. If the deployment is
misconfigured (public bucket, wildcard CORS, `ENFORCE_HTTPS` on behind a broken proxy), some of
these controls degrade — which is why `TROUBLESHOOTING.md` and the post-deploy checklists exist.
