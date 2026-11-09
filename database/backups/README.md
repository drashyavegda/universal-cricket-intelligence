# database/backups/

**No backup files are shipped in this repository, ever** — they contain personal data.

## What the script does

`../../scripts/maintenance/backup.sh` writes a timestamped directory containing:
1. `store.json` — a consistent copy of the JSON store (read while the writer is idle),
2. `postgres.sql` — `pg_dump --no-owner --no-privileges` when `DATABASE_URL` is set (skipped otherwise),
3. `manifest.txt` — timestamp, git commit, row counts, SHA-256 of each file,
4. `env.keys.txt` — **names** of configured environment variables only (never values).

## Restore drill (do this before you need it)

```bash
scripts/maintenance/backup.sh --restore backups/ucip-20261109T1200/
# restores into $DATA_DIR after an interactive confirmation; the previous store is kept as .bak
```

## Retention

| Tier | Keep |
| --- | --- |
| Hourly (if you run it) | 24 |
| Daily | 14 |
| Monthly | 12 |

Store off-machine (object storage bucket with versioning). Encrypt at rest; the store contains user
emails and audit records. Deleting a user in the app does not remove historical audit rows by design —
so a backup can still identify them; treat backups as personal data under the privacy policy.
