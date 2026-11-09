# backend/database/ — Database access (planned)

Nothing in this service connects to a database yet. `DATABASE_URL` is read by `core/config.py` and
reported as a boolean by `/ready` and `/version` so a misconfigured deploy is visible.

Phase 3 introduces the adapter here:
* `session.py` — a lazily created engine with pooling (`DATABASE_POOL_MAX`) and a request-scoped
  session dependency;
* `repositories/` — read-only queries for parity checks (e.g. fetching a player's ball-by-ball series
  so the Python and TypeScript engines can be compared on the same rows);
* health probing in `/ready` with a 2-second timeout, so a slow database degrades readiness rather
  than hanging the process.

Rules when it arrives: no raw SQL string interpolation, migrations only via `database/migrations/`,
and every query used by an endpoint must be covered by an index in the schema.
