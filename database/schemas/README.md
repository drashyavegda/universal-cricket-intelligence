# database/schemas/

`public_schema.sql` is the **reference DDL** for an empty database. It must stay byte-comparable with
the applied migrations: if the two disagree, a fresh environment and a migrated environment behave
differently, which is the worst class of bug to debug.

Verification (run against a scratch database):

```bash
psql "$SCRATCH_URL" -f database/schemas/public_schema.sql
psql "$SCRATCH_URL" -f database/migrations/0001_init.sql   # must be a no-op
pg_dump --schema-only "$SCRATCH_URL" > /tmp/dump.sql        # review, do not commit
```

`views.sql` holds read-only conveniences (player season aggregates) used by analytics queries; they
are deliberately not used by the JSON path, so nothing depends on them existing.
