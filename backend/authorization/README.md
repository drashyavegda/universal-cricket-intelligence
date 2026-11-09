# backend/authorization/ — Authorization

There is no role model in this service by design: it exposes compute to a single trusted caller, so
authorization is binary (valid service token or not).

Role-based authorization (owner/analyst/scout/viewer) is enforced in the Next.js application
(`lib/core/auth/service.ts` + `guard()` in every route handler). If this service ever serves multiple
callers, per-caller scopes must be added before the endpoint is exposed, not after.
