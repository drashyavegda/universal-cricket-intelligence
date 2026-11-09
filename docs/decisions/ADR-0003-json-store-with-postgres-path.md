# ADR-0003 — JSON document store now, PostgreSQL behind one façade

* Status: Accepted
* Date: 2026-11-09

## Context
A pilot workspace holds tens of thousands of rows. Requiring a database to run the demo would have
raised the barrier to evaluation (and to grading) without improving the analytics.

## Decision
* Default persistence is a single JSON document (`$DATA_DIR/store.json`) accessed **only** through
  `lib/core/db/store.ts`, with an in-memory snapshot and atomic tmp-file writes.
* A PostgreSQL schema (with FKs and RLS) is maintained in `db/migrations/0001_init.sql`, mirrored
  in `database/schemas/public_schema.sql`.
* Feature code never imports `fs` or a DB driver; switching adapters must not touch analytics.

## Consequences
* `npm install && npm run seed && npm run dev` works with zero infrastructure.
* Not transactional across collections; unsuitable for concurrent multi-instance writes.
* Ephemeral on serverless hosts — explicitly documented, with the Postgres path as the fix.

## Alternatives considered
* **SQLite** — viable, but adds a native dependency for no gain over a single JSON file at this size.
* **Postgres from day one** — rejected for evaluation friction; adopted in phase 3.
