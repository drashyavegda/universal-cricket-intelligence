# Authentication & authorisation

## Session model

| Property | Value |
| --- | --- |
| Cookie | `ucip_session` |
| Flags | `HttpOnly`, `SameSite=Lax`, `Secure` when `X-Forwarded-Proto: https` |
| Lifetime | `SESSION_MINUTES` (default 720 = 12 h), validated server-side |
| Storage | server-side `sessions[]` with token hash; the raw token never touches the store |
| Invalidation | logout deletes the session; expiry rejects it; password change revokes sessions |

Passwords: scrypt with a per-user salt (`lib/core/auth/crypto.ts`). Lockout: 5 failed attempts →
10-minute lock (`lockedUntil`), recorded in the audit trail. 2FA: optional TOTP per user
(`POST /api/auth/2fa`), secret encrypted with the configured field-encryption key.

## Roles (least privilege)

```ts
owner:   data:upload data:edit data:approve analysis:run shortlist:write shortlist:approve
         report:write settings:ai settings:security admin:users view
analyst: data:upload data:edit analysis:run shortlist:write shortlist:approve report:write view
scout:   analysis:run shortlist:write report:write view
viewer:  view
```

## Calling the API with curl

```bash
# 1. sign in and keep the cookie
curl -s -c cookie.txt -X POST http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"owner@demo.local","password":"Demo#12345"}'

# 2. authenticated read
curl -s -b cookie.txt http://localhost:3000/api/overview | head -c 400

# 3. authenticated write
curl -s -b cookie.txt -X POST http://localhost:3000/api/talent \
  -H 'Content-Type: application/json' -d '{"maxAge":23,"size":10}'

# 4. logout
curl -s -b cookie.txt -X DELETE http://localhost:3000/api/auth/login
```

## Two-layer route protection

1. `middleware.ts` — no cookie ⇒ `307` to `/login?next=…` for workspace paths (HTML UX); `/api/*`
   is not redirected so clients get JSON.
2. `app/(app)/layout.tsx` — validates the token against the session store before rendering.
3. Route handlers — `guard(permission)` on every guarded endpoint (the authoritative check).

## Public endpoints (deliberate)

`/api/health`, `/api/auth/login` (POST/DELETE), `/api/auth/me`, `/api/public/feedback`,
`GET /api/testimonials`, plus the static crawling surfaces (`/sitemap.xml`, `/robots.txt`,
`/opengraph-image`, player share cards). Everything else requires a session.

## Phase-2 (backend/) authentication

The FastAPI service is intended for **service-to-service** calls from the Next.js BFF, not for
browsers. It accepts an optional `Authorization: Bearer $ANALYTICS_SERVICE_TOKEN` shared secret
(`backend/api/deps.py`); when the variable is unset the service runs in local-trust mode and
**must not be exposed publicly** — documented in `docs/deployment/RENDER.md`.

## What is not implemented (do not assume)

* OAuth/SSO — adapter stub only (`auth/service.ts` refuses to claim it is configured).
* Refresh tokens for third-party clients — no public API product in phase 1.
* Per-object ACLs — access is role-based at the route level.
