# infrastructure/render/

The live blueprint is `/render.yaml` (Next.js web service, JSON store on a 1 GB disk, `/api/health`
health check). These templates add what the current file deliberately does not contain: a Python
service and a worker.

## Health checks — the only ones that must exist

| Service | Path | Semantics |
| --- | --- | --- |
| Next.js | `/api/health` | 200 when the store opens and the seed is present; **never** depends on a third party |
| FastAPI | `/health` | 200 when the process is alive; `/ready` reports configuration |

A health check that calls a paid API will page you at 3 a.m. because someone else's service is down.

## Free-tier behaviour you must expect

| Behaviour | Consequence | Mitigation |
| --- | --- | --- |
| Services sleep after ~15 min idle | 30–60 s cold start | Landing page is statically rendered; workspace is behind login, so this is acceptable |
| ~512 MB RAM | `next build` can OOM on small instances | Build locally or on CI with more memory; deploy the built output |
| One instance | per-process rate limiter only | Phase 4 moves the limiter to a shared store |
| Ephemeral disk on redeploy | JSON store resets | Keep `DATA_DIR` on a mounted disk, or use Postgres |
| No custom domains on the free plan for some resources | use the `*.onrender.com` host | Set `NEXT_PUBLIC_SITE_URL` and `CANONICAL_HOST` to whatever host you actually serve |

## Applying a template

1. Copy the service block into the real `/render.yaml` (do not replace the file).
2. Set every `sync: false` value in the dashboard — never commit it.
3. Deploy **only** after `docs/deployment/PRODUCTION_BUILD.md` passes locally.
4. Verify: `curl -s https://<host>/api/health`, then sign in as the owner demo account and confirm
   data persists after a manual redeploy.
