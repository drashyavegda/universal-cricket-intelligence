# Deployment troubleshooting

| # | Symptom | Likely cause | Fix |
| --- | --- | --- | --- |
| 1 | Canonical/OG/sitemap URLs show `localhost` | `NEXT_PUBLIC_SITE_URL` missing at **build** time | set it in the host, redeploy (public env inlines at build) |
| 2 | `/dashboard` returns 500 instead of redirecting | middleware not deployed / matcher changed | verify `middleware.ts` is present and the matcher excludes only static assets |
| 3 | Infinite redirect on `/dashboard` | `CANONICAL_HOST` pointing at a different host than the one served, or `ENFORCE_HTTPS=true` behind a proxy that forwards `http` | unset `CANONICAL_HOST`; set `ENFORCE_HTTPS=false` unless you terminate TLS yourself |
| 4 | Login succeeds but the next request is 401 | multiple hostnames (www + apex) with a SameSite cookie | redirect everything to one canonical host; keep `SameSite=Lax` |
| 5 | Data vanishes after redeploy | Vercel's filesystem is ephemeral | configure PostgreSQL (`DB_ADAPTER=postgres`) or mount a volume on a Node host |
| 6 | Uploads > ~4.5 MB fail on Vercel | platform request-body limit | direct-to-storage uploads (phase 3) or move the app to a Node host |
| 7 | `next build` error: "useSearchParams() should be wrapped in a suspense boundary" | a client page using search params without Suspense | wrap the component in `<Suspense>` (as `/compare` and `/login` do) |
| 8 | Build error: "Missing comma before color stops" in OG image | Satori does not support positioned radial gradients | use `linear-gradient` + solid overlays only |
| 9 | Public form always returns 429 | per-IP limit (5 per 10 min) hit during testing, or a proxy collapsing IPs | wait, or test with a different `X-Forwarded-For`; in production put a shared limiter behind a known client IP header |
| 10 | CAPTCHA never appears | `NEXT_PUBLIC_TURNSTILE_SITE_KEY` unset | set both keys; the secret alone does nothing |
| 11 | CAPTCHA always fails | domain not allowed in the Turnstile widget config | add your production domain to the widget |
| 12 | GA4 shows no data | no measurement ID, or the visitor declined consent | set `NEXT_PUBLIC_GA_MEASUREMENT_ID`; accept the banner; consent is required by design |
| 13 | Testimonials page shows Sample cards | no verified testimonials yet | owner adds real, permission-granted quotes in Settings → Growth & trust, then removes samples |
| 14 | `X-Robots-Tag` missing on private pages | middleware not running (static export?) | confirm the app is deployed as a Node runtime, not a static export |
| 15 | Sitemap lists pages you did not expect | a page was marked `indexable: true` in `lib/site.ts` | set it to `false`; the uniqueness test documents the intent |
| 16 | CORS error calling the Render API | origin missing from `BACKEND_CORS_ORIGINS` or has a trailing slash | add the exact origin, no slash, then redeploy the service |
| 17 | Render API cold-start timeouts | free tier slept | raise `ANALYTICS_TIMEOUT_MS`, keep the service warm, or use a paid instance (the app falls back locally either way) |
| 18 | `psql: too many connections` | pooler not used | use the Supabase pooler URL on port 6543 and reduce `DATABASE_POOL_MAX` |
| 19 | Reports export as 0 bytes | `report:write` permission missing or bad report id | check the 403/404 in the response; exports need a session with `report:write` |
| 20 | AI answers say "DEMO NARRATION" | no `AI_API_KEY` configured | add a provider key, or accept the deterministic fallback (numbers are identical) |
| 21 | Docker build fails at `npm ci` | lockfile out of sync | run `npm install` locally and commit `package-lock.json` |
| 22 | Compose health check never passes | app not bound to `0.0.0.0` | keep `-H 0.0.0.0` and `HOSTNAME=0.0.0.0` |
| 23 | Secret scan fails in CI | an env file or key was committed | remove it, rotate the key, add the path to `.gitignore` |
| 24 | Python tests import error | running pytest from the wrong directory | `cd services/analytics && pytest -q` (or `npm run test:analytics`) |

## Emergency procedures

**Roll back a bad deploy**
Vercel: Deployments → previous → *Promote to Production*. Render: Deploys → previous → *Redeploy*.
Both are instant and do not require a rebuild.

**Restore the workspace**
```bash
scripts/maintenance/backup.sh --restore database/backups/<file>.dump   # Postgres
cp .data/store.json.bak .data/store.json                               # JSON store
```

**Lock down fast (suspected abuse)**
1. Rotate `AI_API_KEY` and `ANALYTICS_SERVICE_TOKEN`.
2. Reduce `AI_MONTHLY_BUDGET_USD` to a low value to stop spend.
3. Set `DEMO_MODE=false` if synthetic data is being mistaken for real output.
4. Review `GET /api/audit` for the actor and timeframe; disable the affected user's session by
   removing it from the store (or change the password, which revokes sessions).
