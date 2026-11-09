# infrastructure/vercel/

`vercel.json` here is a **template**, not the live config. The live config is `/vercel.json` at the
repository root and it is already correct for the current single-app layout.

## When to adopt the template (phase 5 only)

| Change | Reason |
| --- | --- |
| `rootDirectory: "frontend"` | once `app/`, `lib/`, `components/` actually live under `frontend/` |
| keep `maxDuration: 30` | PDF/DOCX/PPTX export of a large report needs headroom; 10 s is not enough |
| keep the header block | the same headers are set in `middleware.ts`; duplicated defence is intentional |
| `regions: ["bom1"]` | Mumbai region suits an India-first user base; keep one region unless latency data says otherwise |

## Free-tier constraints that shaped this file

* **Build minutes and function memory are limited** — no `next/image` optimisation service, no ISR
  regeneration storm. All pages are static or explicitly dynamic.
* **No persistent filesystem** — the JSON store is ephemeral on Vercel. Acceptable for a demo
  deployment; not acceptable for real data. Use Postgres (`DB_ADAPTER=postgres`) for anything real.
* **No cron in a free plan** — anything periodic runs as a workflow trigger that a user starts, or on
  Render (which does support scheduled jobs, also rate-limited).

## Verification after adopting

```bash
npx vercel build --yes   # local build with the same config
curl -sI https://<deployment>/ | grep -i strict-transport
curl -s https://<deployment>/api/health | jq
```
