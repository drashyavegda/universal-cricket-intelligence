# Backup and recovery

## Scope by deployment

| Deployment | What must be backed up | Why |
| --- | --- | --- |
| Local / Docker with JSON store | `$DATA_DIR/store.json` | all state |
| Render with a mounted disk | the disk contents | survives redeploys, not disk failure |
| Postgres | `pg_dump` daily + PITR if available | the real store in production |
| Object storage | bucket versioning | export artefacts |
| Always | environment variable **names** | to rebuild a deployment |

## RPO / RTO — stated honestly

| Tier | RPO (data loss window) | RTO (time to restore) |
| --- | --- | --- |
| Demo (JSON, no schedule) | **everything since the last manual/CI backup** | minutes (copy a file back) |
| Managed Postgres, daily dumps | up to 24 h | 30–60 min |
| Postgres with PITR | minutes | 1–2 h |

There is no automated hourly backup in this repository. Claiming otherwise would be false: the script
exists, the schedule is your responsibility.

## Procedure

```bash
scripts/maintenance/backup.sh                          # writes backups/ucip-<timestamp>/
scripts/maintenance/backup.sh --restore <dir>          # interactive confirmation, keeps a .bak
```

`manifest.txt` records the git commit and per-file SHA-256, so a restore can be verified rather than
hoped for. Restore into a scratch `DATA_DIR` first, run `npm run smoke`, then point the real service at
it.

## What a backup does NOT restore

* `.next` build output (rebuild it),
* host configuration (document env var names; secrets come from the secret store),
* in-flight sessions (users sign in again),
* deleted audit rows (retention is a cap, exported data is your only history).
