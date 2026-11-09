# Data processing inventory

| # | Data | Purpose | Lawful basis | Stored where | Retention | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Account: name, email, role, password hash (scrypt), optional TOTP secret | authentication & access control | contract | JSON store / `users` table | life of account + 30 days | Passwords are never recoverable; reset issues a new hash |
| 2 | Session: random token (hashed in store), expiry, IP hash | keep a user signed in | contract | cookie + store / `sessions` | 12 h (configurable `SESSION_MINUTES`) | Cookie is `httpOnly`, `sameSite=lax`, `secure` in production |
| 3 | Player performance data (uploaded) | the service itself | contract / legitimate interest | store + `dataset_records` + `match_events` | life of workspace | Public figures; still minimal and access-controlled |
| 4 | Uploaded source files (content) | ingestion & provenance | contract | parsed content only; the original blob is not retained beyond the upload request | request lifetime + parsed rows | Stated on the data page |
| 5 | Audit log: actor, action, target, metadata, IP hash | security & accountability | legitimate interest | store / `audit_log` | 2,000-entry cap | No secret values, no full IPs |
| 6 | Public feedback: name, email, topic, message, IP hash, checks | respond to enquiries | consent (checkbox) | store / `feedback_submissions` | 12 months, then delete | Reference `FB-XXXXXX` shared with the submitter |
| 7 | Analytics events (optional) | product improvement | consent (banner), DNT honoured | GA4 (if configured) | 14 months (GA4 setting) | 8 event names, allow-listed params, IP anonymised |
| 8 | Testimonials | marketing | consent of the quoted person | store / `testimonials` | until withdrawn | Draft/hidden/published; sample rows labelled |
| 9 | Server logs (host platform) | debugging & abuse | legitimate interest | Vercel/Render logs | host retention (typically days) | Request path/status; no request bodies are logged |

## Not collected (deliberate)

* No advertising or cross-site identifiers, no fingerprinting, no session recording.
* No payment data — there is no billing in this product.
* No special-category data (health, biometric) — workload metrics are load indicators, not medical data.
* No covert player data: only figures supplied by the operator's own uploads.

## Deletion

Account deletion removes the user, their sessions and their shortlists. Audit rows are retained with the
actor reference nulled (accountability requires the action to survive). Feedback is deleted on request
or after 12 months, whichever is sooner.
