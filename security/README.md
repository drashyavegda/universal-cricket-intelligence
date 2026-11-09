# security/ — policy artefacts

Operational policies that live next to the code they describe. Nothing here is a certification;
nothing here claims compliance. Each document states what is implemented, what is not, and what an
operator must add.

| Document | Covers |
| --- | --- |
| [RATE_LIMITING.md](RATE_LIMITING.md) | Where limits exist, their windows, and the shared-store gap |
| [SPAM_PROTECTION.md](SPAM_PROTECTION.md) | The public-form defence stack and its blind spots |
| [INPUT_VALIDATION.md](INPUT_VALIDATION.md) | Per-endpoint validation rules and sanitisation |
| [AUDIT_EVENTS.md](AUDIT_EVENTS.md) | The event catalogue and retention |
| [SECRETS_MANAGEMENT.md](SECRETS_MANAGEMENT.md) | Key handling, rotation, what must never be committed |
| [BACKUP_AND_RECOVERY.md](BACKUP_AND_RECOVERY.md) | Backup scope, restore drill, RPO/RTO expectations |

Related: `../docs/security/SECURITY_PRACTICES.md` (controls implemented),
`../docs/security/THREAT_MODEL.md` (STRIDE analysis), `../docs/security/KNOWN_GAPS.md` (honest
residual risk — read this before any go-live).

## Non-negotiables

1. No secret in git. Ever. `.env.example` documents names only.
2. Every route handler validates its input and enforces a permission via `guard()`.
3. Every mutation writes an audit entry.
4. Public endpoints are rate-limited, honeypotted and length-bounded.
5. User data is never sent to a third party without consent (`docs/decisions/ADR-0007`).
