# database/

The running application does not need a database: it persists to a JSON document through a single
façade (`lib/core/db/store.ts`). Everything in this folder supports the PostgreSQL path, which is the
recommended deployment for anything beyond a demo.

```
database/
├── migrations/        versioned SQL, applied in order
├── schemas/           reference DDL for a fresh database (must match the migrations)
└── backups/           backup/restore procedure (no data is shipped)
```

## The façade contract

```
lib/core/db/store.ts      read(fn) → snapshot, write(fn) → atomic tmp+rename
        │
        ├── JSON adapter (default)      $DATA_DIR/store.json
        └── Postgres adapter (phase 3)  DATABASE_URL + DATABASE_SSL + DATABASE_POOL_MAX
```

Feature code never imports `fs`, `pg` or a query builder. That is what makes the swap a config change
(`DB_ADAPTER=postgres`) instead of a refactor.

## Migrations

| File | Purpose |
| --- | --- |
| `migrations/0001_init.sql` | the same schema that already exists at `db/migrations/0001_init.sql`: teams, players, venues, matches, events, seasons, datasets, dataset records, users, sessions, audit, reports, shortlists, testimonials, feedback |

Rules: append-only (never edit an applied migration), one logical change per file, and a `-- down`
comment block describing the rollback even when it is not automated.
