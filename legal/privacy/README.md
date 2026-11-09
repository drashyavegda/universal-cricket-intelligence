# Privacy

The live policy is `app/(public)/privacy/page.tsx` — 12 sections, written to be readable rather than
defensive. This folder holds the internal inventory behind it.

| Live section | Backing evidence |
| --- | --- |
| What we collect | [DATA_PROCESSING_INVENTORY.md](DATA_PROCESSING_INVENTORY.md) rows 1–6 |
| Why we collect it | "Lawful basis" column |
| Cookies and analytics | [`../cookies/COOKIE_INVENTORY.md`](../cookies/COOKIE_INVENTORY.md) |
| Who can see it | role table in `docs/security/SECURITY_PRACTICES.md` |
| How long we keep it | retention column + `docs/database/DATA_RETENTION.md` |
| Your rights | access/correction/erasure path via the contact form or the operator email |
| Sub-processors | only if configured: Vercel/Render/Supabase/GA4/AI provider — the page names none that are not used |

## Maintenance rule

If you add a cookie, a third-party script, a new stored field or a new sub-processor, you edit the
inventory **and** the public page in the same pull request. A privacy page that lags the code is worse
than a vague one, because it is untrue.
