# scripts/maintenance/

Low-frequency operations. Each script is deliberately boring: it prints what it will touch, refuses to
run blind, and keeps a copy before overwriting anything.

| Script | Runs when | Requires |
| --- | --- | --- |
| `backup.sh` | daily (cron / Render cron job) | read access to `$DATA_DIR`; `pg_dump` only if `DATABASE_URL` is set |
| `backup.sh --restore <dir>` | incident or drill | the backup directory, interactive confirmation |

## Restore drill (quarterly, non-negotiable)

1. `scripts/maintenance/backup.sh`
2. `DATA_DIR=/tmp/restore-drill scripts/maintenance/backup.sh --restore backups/<latest>`
3. `DATA_DIR=/tmp/restore-drill npm run smoke` against a scratch server
4. Sign in with a demo account; open `/dashboard`, `/data`, `/reports`
5. Record how long it took. If it took longer than the RTO in
   `security/BACKUP_AND_RECOVERY.md`, the RTO is wrong — fix the document, not the fiction.

## What must never be committed

Backups (`backups/`), restored stores, dumps, and any `.env` file. All are git-ignored.
