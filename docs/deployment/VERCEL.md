# Deploying the Next.js app to Vercel

## 1. What Vercel hosts
The Next.js application: public site, workspace UI, all 44 API route handlers, middleware,
metadata routes (`sitemap.xml`, `robots.txt`, OG images). The Python service is **not** hosted
on Vercel (see `RENDER.md`).

## 2. Project setup

1. Push the repository to GitHub/GitLab/Bitbucket.
2. Vercel → **Add New Project** → import the repo.
3. Framework preset: **Next.js** (auto-detected). Build `npm run build`. Install `npm ci`.
   Output: default (`.next`). Root directory: repository root (until the phase-5 split, then
   `frontend/`).
4. Node version: 20.x (Project → Settings → General).

## 3. Environment variables (Production + Preview)

| Variable | Value | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | `https://your-domain.tld` | **Required** — canonical/OG/sitemap origin |
| `NEXT_PUBLIC_CONTACT_EMAIL` | your inbox | shown in footer/privacy/contact |
| `NEXT_PUBLIC_TWITTER_HANDLE` | `@yourhandle` | `twitter:site` |
| `REFERENCE_DATE` | `2027-04-01` | keeps ages/load reproducible |
| `DEMO_MODE` | `true` until real data is loaded | labels synthetic records |
| `DATA_DIR` | `/tmp/ucip` | Vercel's filesystem is ephemeral — see §4 |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | `G-…` | optional, consent-gated |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` + `TURNSTILE_SECRET_KEY` | Turnstile pair | optional CAPTCHA |
| `AI_API_KEY`, `AI_PROVIDER`, `AI_MODEL` | your provider | optional narration |
| `DATABASE_URL`, `DATABASE_SSL=true`, `DB_ADAPTER=postgres` | Supabase pooler URL | required for durable data |
| `ENFORCE_HTTPS` | `false` | Vercel already redirects |

Never add `NEXT_PUBLIC_` to a secret. Vercel exposes those to the browser bundle.

## 4. Persistence — read this before going live

The JSON store writes to the filesystem. On Vercel that is **ephemeral and per-instance**:
serverless functions do not share a disk, and a redeploy discards it. For anything beyond a demo
you must point `DATABASE_URL` at PostgreSQL (see `SUPABASE.md`) or accept that demo data resets.
The app detects this and keeps working (it re-seeds in memory) — it just will not remember
uploads between invocations.

## 5. Domains, TLS and headers

* Add the domain in Vercel → Settings → Domains; TLS is automatic.
* HTTP→HTTPS is handled by Vercel; `vercel.json` additionally declares HSTS and
  `X-Frame-Options: SAMEORIGIN` for the production host.
* Preview deployments are protected by Vercel's own URL privacy; they are not indexed because
  private routes emit `X-Robots-Tag: noindex` and public pages are not linked from the sitemap of
  the production domain.

## 6. Post-deploy checklist

- [ ] `curl -I https://your-domain/` shows `strict-transport-security`, `x-content-type-options: nosniff`
- [ ] `/login` works; `/dashboard` signed-out → `/login?next=%2Fdashboard`
- [ ] `/sitemap.xml` lists exactly the six public pages with the production origin
- [ ] `/robots.txt` references the production sitemap and disallows `/dashboard`, `/api/`
- [ ] `/opengraph-image` returns a 1200×630 PNG
- [ ] Public form submission → thank-you reference; inbox row appears for an owner
- [ ] GA4 (if configured) fires `page_view` only after consent
- [ ] Search Console: verify the domain, submit the sitemap, confirm no private URLs indexed
- [ ] `NEXT_PUBLIC_SITE_URL` has no trailing slash and matches the canonical host exactly

## 7. Troubleshooting quick hits

| Symptom | Cause | Fix |
| --- | --- | --- |
| Sitemap/OG URLs point to localhost | `NEXT_PUBLIC_SITE_URL` unset at build time | set it, then **redeploy** (public vars are inlined) |
| Data disappears after redeploy | ephemeral filesystem | configure PostgreSQL |
| 401 everywhere after login | cookies blocked on a custom domain mismatch | ensure a single canonical host; check `SameSite` |
| Build fails on OG image | Satori CSS subset | use only linear gradients/solid overlays |
| Uploads fail at >4.5 MB | Vercel body limit | use direct-to-storage uploads (phase 3) or raise limits on a Node host |
