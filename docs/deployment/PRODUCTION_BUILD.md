# Production build & release verification

## 1. Pre-flight (must be green)

```bash
npm ci
npx tsc --noEmit
npx vitest run
(cd services/analytics && python -m pytest -q)
(cd backend && python -m pytest -q)     # phase 2+
npm run build
```

Expected at v1.0/v1.1: 0 type errors · 151 vitest · 11 analytics pytest · build 34 routes + middleware.

## 2. Build the artefacts

```bash
# Node app
npm run build                 # .next/

# Container images (same steps as production)
docker build -t ucip-web .
docker build -t ucip-api ./backend
```

## 3. Verify the built app before shipping

```bash
DATA_DIR=.data npm start &            # serves the production build
BASE_URL=http://localhost:3000 node scripts/smoke.mjs   # 58/58 required
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3000/sitemap.xml   # 200
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3000/robots.txt    # 200
curl -s -o /dev/null -w '%{http_code} %{redirect_url}\n' http://localhost:3000/dashboard  # 307 → /login
curl -s http://localhost:3000/opengraph-image -o /tmp/og.png && file /tmp/og.png  # PNG 1200x630
```

## 4. Environment check

* `NEXT_PUBLIC_SITE_URL` = the real https origin (otherwise canonical tags, OG URLs and the
  sitemap point at localhost — the single most common production defect).
* Secrets (`AI_API_KEY`, `TURNSTILE_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
  `FIELD_ENCRYPTION_KEY`, `DATABASE_URL`) are set as **server** env vars, never `NEXT_PUBLIC_*`.
* `ENFORCE_HTTPS=false` unless you front the app yourself (Vercel/Render terminate TLS).

## 5. Release checklist

- [ ] Version bumped in `package.json`; `CHANGELOG.md` entry written
- [ ] Server action/route inventory unchanged, or docs updated
- [ ] `NEXT_PUBLIC_SITE_URL` and contact email correct for the target environment
- [ ] No `.env`, dataset or generated report committed (`git status` review)
- [ ] Smoke suite green against the built app
- [ ] Rollback plan: previous deployment id / image tag noted in the release
- [ ] Post-deploy: run the checklist in `VERCEL.md` §6 and `RENDER.md` §7
