# Local development

## Prerequisites
Node 20.20+ · npm 10.8+ · Python 3.11+ (3.13 tested) · Git. Docker optional.

## Fastest path (no Python, no database)

```bash
npm install
npm run seed        # deterministic demo workspace → .data/store.json
npm run dev         # http://localhost:3000
```

Public site at `/`; sign in at `/login` with `owner@demo.local` / `Demo#12345`.

## Full path (with the FastAPI service)

```bash
# terminal 1 — web
npm install && npm run seed && npm run dev

# terminal 2 — optional compute service
cd services/analytics
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000     # http://localhost:8000/docs
```

Point the web app at it with `ANALYTICS_SERVICE_URL=http://localhost:8000` in `.env.local`.
Leave it blank and everything still works — compute happens in-process.

## Full path with Docker

```bash
cp .env.example .env         # optional; defaults are fine locally
docker compose up --build    # web :3000, api :8000, worker
docker compose --profile db up   # adds PostgreSQL :5432
```

## Reset the workspace

```bash
npm run seed                 # regenerate the synthetic dataset
rm -rf .data && npm run seed # guarantee a clean slate
```

## Everyday commands

| Command | Purpose |
| --- | --- |
| `npm run typecheck` | strict TypeScript |
| `npm test` | 151 vitest tests |
| `npm run test:py` | backend/ pytest (phase 2) |
| `npm run test:analytics` | existing FastAPI service tests |
| `npm run smoke` | 58 end-to-end checks against a running build |
| `npm run build && npm start` | production build locally |

## Common local problems

| Symptom | Cause | Fix |
| --- | --- | --- |
| Empty dashboard, "No workspace data" | `.data` missing | `npm run seed` |
| 307 loops on `/dashboard` | stale session cookie | clear cookies for localhost |
| `next build` fails on `/compare` | `useSearchParams` without Suspense (fixed in 1.0) | ensure the page keeps its `<Suspense>` wrapper |
| Port 3000 busy | another dev server | `PORT=3001 npm run dev` |
| OG image build error about gradients | Satori CSS subset | use `linear-gradient` only in `opengraph-image.tsx` |
