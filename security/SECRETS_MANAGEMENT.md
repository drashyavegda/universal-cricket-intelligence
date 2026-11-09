# Secrets management

## Inventory

| Name | Sensitivity | If leaked |
| --- | --- | --- |
| `AI_API_KEY` | high | spend on your account; rotate immediately |
| `ANALYTICS_SERVICE_TOKEN` | high | call the compute service |
| `DATABASE_URL` | critical | full data access |
| `TURNSTILE_SECRET_KEY` | medium | CAPTCHA bypass |
| `S3_SECRET_ACCESS_KEY` | critical | bucket access |
| `FIELD_ENCRYPTION_KEY` | critical | decryption of encrypted fields |
| `NEXT_PUBLIC_*` | **public by definition** | nothing — they are shipped to the browser |

## Rules

1. **Never** commit a real value. `.env.example` lists names and placeholder text only.
2. `.env`, `.env.local`, `.env.*.local` are git-ignored; the delivery ZIP excludes them explicitly.
3. Client-exposed names must start `NEXT_PUBLIC_` and must be safe to publish — review every addition.
4. Secrets live in the host's dashboard (Vercel/Render env vars) or a secret manager. In local
   development, `.env.local`.
5. Logs never contain secret values. `security/auth.py#redact` shows the pattern: `***last4`.
6. A CI job greps the diff for high-entropy strings and known prefixes (`sk-`, `ghp_`, `AKIA`, `eyJ`)
   on every push (`.github/workflows/security.yml`).

## Rotation

| Secret | Cadence | Procedure |
| --- | --- | --- |
| `AI_API_KEY` | 90 days or on suspicion | new key → set on host → redeploy → revoke old → note in audit log |
| `ANALYTICS_SERVICE_TOKEN` | 90 days | rotate both services in the same window (brief 401s are expected) |
| `DATABASE_URL` password | 180 days | create a second role, migrate, drop the old one |
| `FIELD_ENCRYPTION_KEY` | on compromise only | requires re-encryption migration — plan a window |

After any rotation: confirm `/api/health`, sign in with a real account, run one report export.

## Incident steps

1. Revoke the exposed credential at the provider (first, before investigating).
2. Replace host secrets; redeploy.
3. Set `AI_MONTHLY_BUDGET_USD=0` while you investigate spend.
4. Review `/api/audit` for the exposure window.
5. Record what happened and what changed; do not quietly delete logs.
