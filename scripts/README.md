# scripts/

Operational scripts for the target monorepo. The two that already exist at the repository root are
`scripts/seed.ts` and `scripts/smoke.mjs` — these add the gate runner and maintenance tooling.

| Script | Purpose | Safe to run anywhere? |
| --- | --- | --- |
| `verify.sh` | runs every quality gate in order and stops at the first failure | yes (read-only, builds into `.next`) |
| `maintenance/backup.sh` | backup / restore the data store | **no** — writes to `backups/`; restore asks for confirmation |
| `maintenance/README.md` | retention and restore drill | — |

## verify.sh — what it proves

| Step | Command | Proves |
| --- | --- | --- |
| 1 | `npm run typecheck` | types are sound |
| 2 | `npm test` | 168 unit/integration tests pass |
| 3 | `npm run build` | the app compiles and 35 routes render |
| 4 | `npm run seed` + `npm run smoke` | the live server answers 58 checks (needs a running server) |
| 5 | `python -m pytest` (if `backend/` is present) | 15 service tests pass |
| 6 | secret scan | no key-like strings in tracked files |

Rules: fail fast, print a one-line summary per step, and never mask a non-zero exit code with a pipe
(`set -o pipefail`). A red gate is information, not an inconvenience.
