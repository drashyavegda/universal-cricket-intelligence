# Admin (owner) guide

Owners hold every permission. That makes this guide about control, not capability.

## 1. Users and roles (`/settings`)

| Role | Grant when |
| --- | --- |
| `owner` | Trusted leads only — they can approve data, change settings and publish content |
| `analyst` | People who ingest and analyse data |
| `scout` | Field staff who read, shortlist and report |
| `viewer` | Stakeholders who must never change anything |

Demo accounts (`owner@demo.local`, …) exist only for evaluation. **Rotate or delete them before a
real deployment** — they are documented in the README, which means they are public knowledge.

## 2. Data governance

* Approve datasets only after reading the validation summary. Approval promotes rows into the
  analytics layer, and every downstream number inherits that decision.
* Merge conflicts beyond tolerance must be resolved, not averaged.
* Check `/data` → Quality after each import: a falling quality score invalidates benchmarks.

## 3. Security settings

| Setting | Guidance |
| --- | --- |
| 2FA | Enable for every owner; the platform supports TOTP per user |
| Session length | 720 min default; shorten for shared machines |
| AI budget | Set `AI_MONTHLY_BUDGET_USD` to a value you are willing to spend; the gateway stops at the cap |
| Provider key | Stored server-side; the UI only ever shows `hasApiKey` |

## 4. Audit trail

`GET /api/audit` (or Settings → Audit) lists sign-ins, failed logins, approvals, report generation,
exports, settings changes, testimonial edits and public submissions. It is append-only and capped
at 2,000 entries. For retention beyond that, export it before the cap is reached.

## 5. Growth & trust (Settings → Growth & trust)

* **Testimonials** — add only quotes you have permission to publish. Publish/hide/draft are one
  click; every change is audited. Use "Remove all sample rows" once real quotes exist; the public
  page stops showing the "no verified testimonials" banner automatically.
* **Feedback inbox** — public messages with the spam-check trace. Acknowledge or close; nothing is
  deleted, so a repeat contact can be recognised by reference (`FB-XXXXXX`).

## 6. Public-form abuse

If submissions spike: lower the window in `lib/core/growth/forms.ts` (5 per 10 min), add Turnstile
keys, or block the source at the proxy. Do not disable the honeypot.

## 7. Backup and restore

```bash
scripts/maintenance/backup.sh                 # JSON store + Postgres dump + config snapshot
scripts/maintenance/backup.sh --restore <f>   # restore with a confirmation prompt
```

Test a restore into a scratch directory before you need one.

## 8. Incident checklist

1. Rotate `AI_API_KEY` and `ANALYTICS_SERVICE_TOKEN`.
2. Set `AI_MONTHLY_BUDGET_USD=0` if spend is the concern (blocks narration, keeps analytics).
3. Review `/api/audit` for actor + timeframe.
4. Change the affected user's password (revokes their sessions) or remove the account.
5. Write down what happened, in the audit trail's terms, in the incident log of your choice.
