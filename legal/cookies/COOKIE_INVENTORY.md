# Cookie and local storage inventory

| Key | Type | Purpose | Lifetime | Consent required |
| --- | --- | --- | --- | --- |
| `ucip_session` | cookie (`httpOnly`, `sameSite=lax`, `secure` in production) | signed-in session for the private workspace | 12 h, sliding | No — strictly necessary |
| `ucip.analytics.consent` | localStorage | remembers the visitor's analytics choice (`granted` / `denied`) | until cleared | No — it *records* consent |
| `_ga`, `_ga_*` | third-party cookie (GA4) | aggregated product analytics | 14 months | **Yes** — only set after `granted` |

## Behaviour

* With no `NEXT_PUBLIC_GA_MEASUREMENT_ID`, no analytics script is loaded at all and `_ga` cookies are
  never created.
* Declining, or having `navigator.doNotTrack === '1'`, keeps analytics off and shows no further prompts.
* Consent can be withdrawn from the footer on any page; the choice takes effect on the next navigation.
* No cookie is used for advertising, profiling or cross-site tracking.

## Verification

```bash
curl -sI https://<host>/ | grep -i set-cookie           # should show only ucip_session after sign-in
# Browser devtools → Application → Cookies: with consent denied, expect no _ga* entries
```

Keep this table and `app/(public)/privacy/page.tsx` in sync — both are user-facing promises.
