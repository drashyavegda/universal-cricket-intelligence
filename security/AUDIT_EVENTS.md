# Audit event catalogue

Append-only, capped at 2,000 entries in the JSON store, exposed read-only at `GET /api/audit`
(owner/analyst). Each entry: `id, at, actorId, actorEmail, action, target, metadata, ipHash`.

| Action | Target | Extra metadata | Triggered by |
| --- | --- | --- | --- |
| `auth.login` | user id | method (`password`/`totp`), userAgent | sign-in |
| `auth.login_failed` | email hash | reason | bad password / locked |
| `auth.logout` | user id | — | sign-out |
| `auth.password_changed` | user id | — | settings or reset |
| `auth.2fa_enabled` / `_disabled` | user id | — | security settings |
| `dataset.uploaded` | dataset id | fileName, rowCount, sizeBytes | upload |
| `dataset.validated` | dataset id | errors, warnings, qualityScore | validation run |
| `dataset.approved` / `_rejected` | dataset id | approver, reason | governance |
| `dataset.merged` | dataset id | conflictCount, tolerance | merge |
| `record.corrected` | record id | fields changed | manual edit |
| `report.generated` | report id | kind, quality, sections | report builder |
| `report.exported` | report id | format | export route |
| `shortlist.created` / `_updated` | shortlist id | playerCount | shortlists |
| `settings.updated` | settings | changedKeys (never values) | settings |
| `ai.budget_exceeded` | workspace | spentUsd, capUsd | gateway |
| `testimonial.created` / `_published` / `_hidden` / `_deleted` | testimonial id | isSample | growth admin |
| `testimonial.samples_removed` | — | removedCount | growth admin |
| `feedback.received` | feedback reference | topic, checks | public form |
| `feedback.status_changed` | feedback reference | from, to | growth admin |
| `security.rate_limited` | route | scope, retryAfter | limiter |

## Rules

1. **Never log a secret, password, token or full IP** — `ipHash` only.
2. Metadata records **keys changed**, not values (a value could be a secret).
3. Audit rows are not editable or deletable through the API. Retention is by cap, so export before
   it fills if you need history.
4. A failed action is as important as a successful one — `auth.login_failed` exists precisely because
   it is the signal you need during an incident.
