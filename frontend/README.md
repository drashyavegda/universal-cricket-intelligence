# frontend/ — the Next.js 14 application

This is the **real application** (not a map). Vercel must point at this directory:
**Root Directory = `frontend`**. See `../docs/deployment/VERCEL.md`.

```
frontend/
├── app/                 30 pages · 26 layouts · 46 API route handlers
│   ├── (public)/        landing, /tour, /faq, /privacy, /testimonials, /contact, /thank-you
│   ├── (app)/           private workspace: /dashboard … /settings, /system
│   ├── login/           sign-in
│   ├── api/             route handlers (auth, data, players, auction, reports, service, …)
│   ├── robots.ts · sitemap.ts · opengraph-image.tsx · not-found.tsx
├── components/          ui.tsx · shell.tsx · charts.tsx · public-chrome.tsx · service-status.tsx …
├── lib/
│   ├── api/             helpers.ts (guard/json/fail) · backend.ts (FastAPI client)
│   ├── client/          api.ts (fetch façade) · analytics.ts (consent-gated GA4)
│   ├── content/         faq.ts · tour.ts
│   ├── core/            40 deterministic analytics modules (data, players, ranking, team,
│   │                    auction, sim, pitch, career, workload, scouting, knowledge,
│   │                    shortlists, reporting, security, growth, auth, db, ai)
│   └── site.ts          SITE constants + the single metadata registry
├── public/              favicon.svg + static assets (robots/sitemap/OG are generated at runtime)
├── src/                 layer map, feature specs, typed starters (routes/navigation/format)
├── tests/               11 vitest files, 168 tests
├── sample-data/         synthetic demo files (labelled DEMO)
├── scripts/             seed.ts (deterministic demo workspace) · smoke.mjs (58 live checks)
├── middleware.ts        session gate, HTTPS/canonical redirect, security + noindex headers
├── next.config.mjs      security headers, body limits, external server packages
├── vercel.json          headers/functions for the Vercel deployment of this directory
└── package.json         the app's dependencies and scripts
```

## Run it

```bash
npm install
npm run seed        # 190 synthetic players, 10 teams, 12 venues — labelled DEMO
npm run dev         # http://localhost:3000
```

Demo sign-in: `owner@demo.local` / `Demo#12345` (also analyst/scout/viewer — see the root README).

## Connect the FastAPI service (optional)

```bash
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:8000     # or https://<service>.onrender.com
# ANALYTICS_SERVICE_TOKEN=...                 # only if the service sets one
BACKEND_TIMEOUT_MS=4000
```

Then open **Service Status** (`/system`) in the workspace. It reports endpoint, latency, readiness,
version and *which engine answered*. The browser never calls FastAPI directly: `/api/service/*`
route handlers do it server-side, so the token stays server-side and no CORS is needed.

Without the variable the app is fully functional on its own engines — the page says so explicitly
rather than showing a broken widget.

## Quality gates

```bash
npm run typecheck   # tsc --noEmit, strict
npm test            # 168 tests
npm run build       # 35 routes + middleware
npm start &         # serve the production build
npm run smoke       # 58 live checks
```

## `src/` — why it exists

`src/` holds the layer map (`src/app/README.md`), the component taxonomy, the 16 feature folders
(scope + acceptance criteria + pointers to the real modules), the public-asset folders
(`public/` equivalents for images/icons/fonts) and three typed starters
(`config/routes.ts`, `constants/navigation.ts`, `utils/format.ts`). It is documentation and
helpers; it is never a second copy of a page. Nothing in `app/` imports from `src/` today except
the starters, and the typecheck covers both.
