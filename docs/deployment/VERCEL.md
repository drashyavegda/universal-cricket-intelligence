# Deploying the Next.js app to Vercel

## 0. The error this document fixes

```
Error: Couldn't find any pages or app directory. Please create one under the project root.
```

**Cause:** Vercel built the repository root. The root has no `app/` or `pages/` directory because the
Next.js application lives in **`frontend/`** (monorepo layout: `frontend/` = Next.js, `backend/` =
FastAPI on Render, `docs/` = documentation).

**Fix (30 seconds):**

1. Vercel → your project → **Settings → General → Root Directory** → `frontend` → **Save**.
2. **Deployments → ⋯ → Redeploy** (a redeploy is required; changing Root Directory does not rebuild
   automatically).
3. Optional but recommended: in the same screen set **Framework Preset = Next.js**,
   **Build Command = `npm run build`**, **Install Command = `npm install`**,
   **Output Directory = `.next`** (defaults are correct once Root Directory is `frontend`).

Do **not** add a root-level `vercel.json` with `buildCommand: "cd frontend && npm run build"`:
that fights the Root Directory setting and is the second most common cause of this error.

## 1. What Vercel hosts

The Next.js application only: the public site, the private workspace, all **46 API route handlers**,
middleware, and the metadata routes (`sitemap.xml`, `robots.txt`, OG images). The FastAPI service is
**not** hosted on Vercel — it runs on Render (see `RENDER.md`).

## 2. Project setup from scratch

| Setting | Value |
| --- | --- |
| Repository | your GitHub repo (monorepo) |
| **Root Directory** | **`frontend`** |
| Framework preset | Next.js (auto-detected once Root Directory is correct) |
| Install command | `npm install` (or `npm ci`; `frontend/package-lock.json` is committed) |
| Build command | `npm run build` |
| Output directory | `.next` (default) |
| Node version | 20.x (Settings → General → Node.js Version) |

Vercel installs **inside `frontend/`**, so it never touches `backend/` (Python) or `services/`
— no Docker, no Python build step, no monorepo tooling required.

## 3. Environment variables (Production and Preview)

| Variable | Required | Value / notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | **yes** | `https://your-domain.tld` — no trailing slash. Drives canonical URLs, `og:url` and every `<loc>` in the sitemap. |
| `NEXT_PUBLIC_API_URL` | to connect FastAPI | Your Render service origin, e.g. `https://ucip-analytics.onrender.com`. **Origin only** — no trailing slash, no `/docs`. |
| `ANALYTICS_SERVICE_TOKEN` | if Render sets it | Same value as `ANALYTICS_SERVICE_TOKEN` on the Render service. Server-only — but it is typed into the Vercel UI, never into `NEXT_PUBLIC_*`. |
| `BACKEND_TIMEOUT_MS` | no | Probe timeout, default `4000`. |
| `NEXT_PUBLIC_CONTACT_EMAIL` | no | Shown in footer, contact page, privacy policy. |
| `NEXT_PUBLIC_TWITTER_HANDLE` | no | `twitter:site`. |
| `REFERENCE_DATE` | recommended | `2027-04-01` — keeps ages, load windows and forecasts reproducible. |
| `DEMO_MODE` | recommended | `true` until real data is approved; labels synthetic records. |
| `DATA_DIR` | recommended | `/tmp/ucip` — see §4 (ephemeral filesystem). |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | no | GA4, loaded only after consent. |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` + `TURNSTILE_SECRET_KEY` | no | CAPTCHA pair, both required to enable. |
| `AI_API_KEY`, `AI_PROVIDER`, `AI_MODEL` | no | Without a key, narration is deterministic and labelled. |
| `DATABASE_URL`, `DATABASE_SSL=true`, `DB_ADAPTER=postgres` | for durable data | Supabase pooler URL — see `SUPABASE.md`. |
| `ENFORCE_HTTPS` | no | `false` — Vercel already redirects at the edge. |

Rules:

* `NEXT_PUBLIC_*` values are **inlined at build time**. Changing one requires a **redeploy**, not just
  a restart.
* Never put a secret in a `NEXT_PUBLIC_` variable. The FastAPI token deliberately has no prefix.
* Set the same variables for the **Preview** environment if you want preview builds to reach FastAPI.

## 4. Persistence — read before going live

The workspace JSON store writes to the filesystem. On Vercel that filesystem is **ephemeral and
per-instance**: serverless functions do not share a disk and a redeploy discards it. The app detects
this, re-seeds in memory and keeps working — but uploads are not remembered between invocations.
For anything beyond a demo, point `DATABASE_URL` at PostgreSQL (`SUPABASE.md`) or host the Next.js
server on Render/a container with a mounted disk.

## 5. FastAPI connection behaviour on Vercel

* The browser never calls FastAPI. `/api/service/status` and `/api/service/describe` are Next.js
  route handlers that call Render **server-side**, so CORS on the FastAPI host only has to allow the
  Vercel deployment origin (and this integration does not need it at all).
* Free Render instances sleep after ~15 minutes idle; the first request can take 30–60 s. The probe
  times out at 4 s and reports `timeout` with a "wake it and recheck" hint rather than hanging a page.
* Every failure is visible in the UI at **`/system`** (sidebar → Service Status) and in the compact
  card on `/dashboard`. The failure state always names the next step.

## 6. Post-deploy checklist

- [ ] `curl -I https://your-domain/` → `200`, `strict-transport-security`, `x-content-type-options: nosniff`
- [ ] `curl -I https://your-domain/dashboard` → `307` to `/login?next=%2Fdashboard`
- [ ] Sign in with a demo account → `/dashboard` renders KPIs
- [ ] Sidebar → **Service Status** → badge is `CONNECTED` (or an explicit `UNREACHABLE` with a hint)
- [ ] **Run probe** on `/system` → `ANSWERED BY FASTAPI`
- [ ] `/sitemap.xml` lists exactly 6 public URLs with the production origin
- [ ] `/robots.txt` disallows `/dashboard`, `/api/` and references the sitemap
- [ ] `/opengraph-image` returns a 1200×630 PNG
- [ ] `/api/service/status` without a session → `401 AUTH_REQUIRED`

## 7. Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| *Couldn't find any pages or app directory* | Root Directory is the repo root | set Root Directory = `frontend`, redeploy |
| Build succeeds but 404 on every route | Output Directory overridden (e.g. `out`) | clear it; Next.js uses `.next` |
| Sitemap/OG URLs point at `localhost:3000` | `NEXT_PUBLIC_SITE_URL` unset **at build time** | set it, redeploy |
| `/system` shows `NOT CONFIGURED` after adding the variable | public vars are build-time | redeploy |
| `/system` shows `UNREACHABLE` | Render instance asleep, wrong URL, or `https://` typo | open the Render URL in a browser, then Recheck |
| `401` from FastAPI | token mismatch between Vercel and Render | set the same `ANALYTICS_SERVICE_TOKEN` on both |
| Data disappears after a redeploy | ephemeral filesystem | configure PostgreSQL |
| Uploads fail above 4.5 MB | Vercel request body limit | keep files < 4.5 MB or add direct-to-storage uploads |
| Build fails on the OG image | Satori CSS subset | linear gradients + solid overlays only |

## 8. Rollback

Vercel keeps every deployment. **Deployments → ⋯ → Promote to Production** on a known-good build is
the fastest rollback. Because `NEXT_PUBLIC_*` values are baked into each build, rolling back also
rolls back the API endpoint — which is the behaviour you want if a bad endpoint caused the incident.
