# Public form protection

Applies to `/contact` → `POST /api/public/feedback`.

## Defence stack (in order of evaluation)

| # | Check | Rejects | Cost to a real user |
| --- | --- | --- | --- |
| 1 | Rate limit (5 / 10 min, hashed IP) | bursts and scripted floods | none |
| 2 | Honeypot field (`company_website`, hidden, `aria-hidden`, `tabindex=-1`) | naive form-fillers | none |
| 3 | Minimum fill time (1.2 s between mount and submit) | instant POSTs | none (fast humans are > 1.2 s) |
| 4 | Cloudflare Turnstile (only if both keys set) | sophisticated bots | one invisible challenge |
| 5 | Server validation: required fields, lengths (`name` 2–80, `email` ≤ 160, `message` 20–2000), topic allow-list | malformed payloads | inline error copy |
| 6 | Normalisation + control-character stripping, URL count ≤ 2 | link spam, header injection | none |
| 7 | Duplicate suppression (same email + message hash within 15 min) | double submits, retries | none |

Rejections 2–4 return the **same** success-shaped response (silent rejection) so a bot learns nothing;
rejections 1, 5, 6 return explicit, human-readable errors because a real person may have tripped them.

## Trace

Every submission stores `checks[]` — e.g.
`[{"check":"rateLimit","passed":true},{"check":"honeypot","passed":true},{"check":"minTime","passed":true},{"check":"captcha","passed":null}]`
where `null` means "not configured", never "passed". Admins see this in Settings → Growth & trust.

## Blind spots

* A patient, low-volume human-driven spam campaign will pass every check.
* Turnstile is off by default, so a determined bot with real-browser automation is not stopped.
* No third-party content scanning (no link reputation lookup).
* The `mailto:` fallback in the error copy gives a human an escape hatch if the form breaks entirely.
