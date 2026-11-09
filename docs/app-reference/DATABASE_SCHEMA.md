# Database schema

`db/migrations/0001_init.sql` is the authoritative schema (PostgreSQL 14+). It is written so a
plain Postgres instance works with no optional extensions beyond `pgcrypto` and `citext`.

## Entity groups

| Group | Tables | Notes |
| --- | --- | --- |
| Tenancy & identity | `organisations`, `users`, `sessions` | Every table below carries `organisation_id` and is protected by RLS. |
| Provenance | `sources`, `player_provenance` | Reliability 0–1 per source; every promoted field can point back at a source row. |
| Ingestion | `datasets`, `dataset_files`, `dataset_records` | Raw fields stored as JSONB *and* the canonical mapping, so a bad mapping is auditable and reversible. |
| Players | `players`, `player_stat_lines` | `dob` is nullable on purpose: unknown is unknown. Identity index on `(organisation_id, lower(name), coalesce(dob,'1900-01-01'))`. |
| Conditions | `venues`, `weather_observations` | Pitch profile as JSONB; observations timestamped per venue. |
| Competition | `teams`, `squad_members`, `matches`, `match_events` | `match_events` is one row per ball with a unique `(match, innings, over, ball)`. |
| Market | `auction_history`, `shortlists`, `shortlist_items` | `synthetic` flag on auction history distinguishes generated comparables from real prices. |
| Output | `reports`, `workflow_runs` | Reports store sections + quality + sources as JSONB; workflow runs store step detail. |
| Governance | `ai_usage`, `audit_log`, `notifications`, `platform_settings` | `audit_log` is append-only (trigger blocks UPDATE/DELETE). |

## Key relationships

```
organisations 1─┬─* users ─* sessions
                ├─* datasets ─* dataset_files
                │            └─* dataset_records ──(promote)──► players
                ├─* players ─┬─* player_stat_lines
                │            ├─* player_provenance
                │            └─* squad_members ─► teams
                ├─* venues ─* weather_observations
                ├─* matches ─* match_events
                └─* reports / workflow_runs / ai_usage / audit_log / notifications
```

## Row-level security

Every tenant table gets:

```sql
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE players FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON players
  USING (organisation_id = current_setting('app.organisation_id', true))
  WITH CHECK (organisation_id = current_setting('app.organisation_id', true));
```

The application sets the tenant once per transaction:

```sql
BEGIN;
SET LOCAL app.organisation_id = '00000000-0000-0000-0000-000000000001';
-- queries here are automatically scoped
COMMIT;
```

Because `current_setting(..., true)` returns NULL when unset, a missing tenant setting returns
**no rows** rather than all rows — the policy fails closed.

## Append-only audit

```sql
CREATE TRIGGER audit_log_no_update BEFORE UPDATE OR DELETE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION deny_audit_mutation();
```

Application roles should also be granted only `INSERT`/`SELECT` on `audit_log`.

## Views

- `v_player_season_totals` — season aggregates per player.
- `v_dataset_approval_rate` — approved ÷ total records per dataset (data-quality KPI).

## Demo store parity

`lib/core/db/store.ts` mirrors these shapes as JSON (`StoreShape`). The TypeScript types in
`lib/core/types.ts` are the single source of truth shared by both backends, so switching from the
JSON store to Postgres does not change any engine or UI code.

## Operational queries

```sql
-- who approved what, newest first
SELECT at, actor, action, entity, detail FROM audit_log ORDER BY at DESC LIMIT 50;

-- which datasets are producing unusable rows
SELECT d.name, count(*) FILTER (WHERE r.status='approved') AS approved,
       count(*) FILTER (WHERE r.status='pending')  AS pending
FROM datasets d JOIN dataset_records r ON r.dataset_id = d.id GROUP BY d.name;

-- players still carrying demo data after a real import
SELECT count(*) FROM players WHERE synthetic;
```
