# backend/authentication/ — Service authentication

End users authenticate against the Next.js application (scrypt password hashing, 12-hour session
cookie, optional TOTP). This service never sees user credentials.

What exists here instead: `security/auth.py` + `api/deps.py` implement a **shared bearer token**
(`ANALYTICS_SERVICE_TOKEN`) compared in constant time. When the token is unset the service runs in
local-trust mode and says so in the logs and in `/ready` — a deployment must never believe it is
protected when it is not.
