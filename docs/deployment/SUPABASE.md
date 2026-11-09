# Supabase: PostgreSQL + object storage

## 1. Postgres

1. Create a project (region closest to your users; note the strong password).
2. Run the schema: **SQL Editor** → paste `database/schemas/public_schema.sql` (a mirror of
   `db/migrations/0001_init.sql`) → Run. This creates tables, indexes, FKs and RLS policies.
3. Connection strings (Project Settings → Database):
   * **Pooler** (recommended for serverless/Vercel):
     `postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres?pgbouncer=true`
   * Direct (migrations/backups only): port `5432`.
4. Configure the app:

```bash
DB_ADAPTER=postgres
DATABASE_URL=postgresql://…:6543/postgres?pgbouncer=true
DATABASE_SSL=true
DATABASE_POOL_MAX=10
```

5. Verify: `psql "$DATABASE_URL" -c '\dt'` lists the tables; the app's health endpoint reports
   `mode: "postgres"` once the adapter is wired (phase 3 item — today the JSON store is the
   default and `DB_ADAPTER` is read but unused by feature code).

## 2. Row-level security

The migration enables RLS and scopes rows by `organisation_id`. The application connects with a
role that carries the organisation claim. **Test with two organisations** before trusting it:
one tenant must never read another's rows. Until phase 3 lands, RLS is a database-level
protection that the JSON path does not use — do not claim multi-tenancy is enforced before then.

## 3. Object storage

| Setting | Value |
| --- | --- |
| Bucket (uploads) | `ucip-uploads` — **private** |
| Bucket (reports) | `ucip-reports` — **private**, short-lived signed URLs |
| Public buckets | none. Nothing user-uploaded should be publicly readable |
| Path convention | `uploads/<datasetId>/<uuid>.<ext>`, `reports/<reportId>/<format>.<ext>` |
| Max object size | match `MAX_UPLOAD_MB` (25 MB default) |

Environment:

```bash
SUPABASE_URL=https://<ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<secret>          # server only, bypasses RLS — treat as a root key
SUPABASE_STORAGE_BUCKET=ucip-uploads
# or any S3-compatible provider:
STORAGE_DRIVER=s3
S3_ENDPOINT=… S3_REGION=… S3_BUCKET=… S3_ACCESS_KEY_ID=… S3_SECRET_ACCESS_KEY=…
```

**Never** expose `SUPABASE_SERVICE_ROLE_KEY` or the S3 secret to the browser. The anon key is
public by design but is not used for uploads in this design — uploads go through a route handler
that authenticates the session first.

## 4. Free-tier realities

* Free projects **pause after ~7 days of inactivity** — schedule a keep-alive ping or accept a
  cold start.
* 500 MB database + 1 GB storage on the free tier; a season of ball-by-ball data will exceed this
  quickly (plan the paid tier or a self-managed instance).
* Backups: free tier has limited retention. Take your own with
  `scripts/maintenance/backup.sh` and store dumps off-platform.

## 5. Migration workflow

```bash
# apply a new migration locally first
psql "$LOCAL_DATABASE_URL" -f database/migrations/0002_add_x.sql
# then production (maintenance window; take a dump first)
scripts/maintenance/backup.sh && psql "$DATABASE_URL" -f database/migrations/0002_add_x.sql
```

Every migration file must contain a rollback note in its header. Immutable once applied.
