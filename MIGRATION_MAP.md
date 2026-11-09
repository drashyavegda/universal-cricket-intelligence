# Migration map — target path ⇄ what already exists

This is the file to read before copying anything from this package into your repository.
Every target path is labelled:

* **EXISTS** — already implemented. The package documents it; it ships **no copy**.
* **NEW** — generated here. Safe to copy in (it does not exist yet).
* **PLANNED** — folder/scope reserved. No code claimed.

Machine-readable equivalent: [`PROJECT_STRUCTURE.json`](PROJECT_STRUCTURE.json).

---

## 1. Files you must NOT overwrite

| Path in this package | Why | Do this instead |
| --- | --- | --- |
| `package.json` | Your repo already has the real Next.js manifest at root | Keep yours. Merge only the extra `scripts` you want, or adopt this manifest in phase 5 after moving the app under `frontend/`. |
| `Dockerfile` | Your repo has a working multi-stage image | Keep yours unless you need the ARG-driven build args added here. |
| `docker-compose.yml` | Yours already defines app + analytics + db profiles | Add the `api` / `worker` services from this file when you start phase 4. |
| `.env.example` | Yours is accurate for the app | This file is a superset; merge the backend/Supabase block only. |
| `.gitignore` | Yours already ignores the right things | Merge the extra `data/…`, `reports/generated/…`, `database/backups/…` lines. |
| `vercel.json`, `render.yaml` at root | Live deployment config | The copies here live under `infrastructure/` as annotated templates; diff before replacing. |

Everything else in this package is additive.

## 2. Root documentation

| Target | Status | Notes |
| --- | --- | --- |
| `README.md` | NEW (supersedes nothing) | Package-specific intro; your app README stays as the app's front door |
| `PRD.md` | NEW | 30 FRs + 14 WFRs with acceptance criteria |
| `PROJECT_BLUEPRINT.md` | NEW | Phases, gates, workstreams, risk register |
| `ARCHITECTURE.md` | NEW (complements `docs/ARCHITECTURE.md`) | Runtime topology incl. phase-2 hybrid |
| `ROADMAP.md`, `CHANGELOG.md`, `CONTRIBUTING.md`, `LICENSE` | NEW | — |
| `MIGRATION_MAP.md`, `PROJECT_STRUCTURE.json`, `FILES_TO_IMPLEMENT.md` | NEW | Traceability set |

## 3. Application code → `frontend/` (DONE — phase 5 executed)

The Next.js application has been moved into `frontend/`. Vercel builds that directory
(**Root Directory = `frontend`**). Nothing is left at the repository root that Next.js needs.

| Target | Status | Source of truth |
| --- | --- | --- |
| `frontend/app/**` (30 pages, 26 layouts, 46 route handlers) | **DONE** | moved from `app/` |
| `frontend/components/**` | **DONE** | moved from `components/` |
| `frontend/lib/**` (40 core modules + api/client/content/site) | **DONE** | moved from `lib/` |
| `frontend/public/**`, `frontend/types/**` | **DONE** | moved |
| `frontend/tests/**` (11 files, 168 tests) | **DONE** | moved |
| `frontend/sample-data/**`, `frontend/scripts/{seed.ts,smoke.mjs}` | **DONE** | moved |
| `frontend/middleware.ts`, `next.config.mjs`, `tsconfig.json`, `tailwind.config.ts`, `postcss.config.mjs`, `vitest.config.ts`, `next-env.d.ts` | **DONE** | moved |
| `frontend/package.json` + `package-lock.json` | **DONE** | moved (Vercel installs here) |
| `frontend/vercel.json` | **NEW** | per-directory Vercel config |
| `frontend/src/**` | **NEW (docs + starters)** | layer map, 16 feature specs, asset folders, `config/routes.ts`, `constants/navigation.ts`, `utils/format.ts` |
| `frontend/lib/api/backend.ts`, `frontend/components/service-status.tsx`, `frontend/app/(app)/system/`, `frontend/app/api/service/{status,describe}/` | **NEW** | FastAPI connection (NEXT_PUBLIC_API_URL) |
| `services/analytics/**` | moved to repository root | phase-1 Python service, referenced by root scripts |

## 4. Python → `backend/`

| Target | Status | Existing source of truth |
| --- | --- | --- |
| `backend/**` | NEW | `services/analytics/app/{main,compute}.py` is the current, optional compute service |
| `services/analytics/**` | EXISTS (kept) | Move into `backend/` only in phase 4, after parity tests |

`backend/` does not import from `services/analytics`; it is a standalone FastAPI package that
re-implements transport concerns (config, logging, CORS, health, errors) and calls its own
service modules. The existing service keeps working untouched.

## 5. Other areas

| Target | Status | Notes |
| --- | --- | --- |
| `docs/{requirements,architecture,database,api,deployment,security,testing,user-guides,decisions}` | NEW | 24 documents; the app's existing `docs/*.md` remain and are cross-referenced |
| `database/migrations/README.md` | NEW | Points at the existing `db/migrations/0001_init.sql` |
| `database/seeds/` | NEW | Labelled sample reference data only |
| `database/schemas/` | NEW | `public_schema.sql` mirroring the migration for fresh installs |
| `database/backups/` | NEW | Retention policy + `scripts/maintenance/backup.sh` |
| `security/**` | NEW | Policy catalogues that map to implemented controls |
| `analytics/**` | NEW | Model contracts + a real evaluation module (`metrics.py`) |
| `data/**` | NEW | JSON Schemas for player/dataset records + data dictionary |
| `reports/**` | NEW | Templates and export conventions (generated files are git-ignored) |
| `marketing-seo/**` | NEW | Metadata registry, OG spec, GA4 event catalogue, FAQ map, testimonial policy |
| `legal/**` | NEW | Privacy pointer, cookie inventory, disclaimers, **draft** terms |
| `scripts/**` | NEW (existing: `scripts/seed.ts`, `scripts/smoke.mjs`) | Grouped shell scripts; existing files untouched |
| `tests/{unit,integration,e2e,performance,security,fixtures}` | NEW folders (existing flat `tests/*.test.ts` stays) | Taxonomy + plans; no duplicate test code |
| `infrastructure/**` | NEW | Deployment templates and runbooks |
| `.github/workflows/*` | NEW | CI, security scan, release |

## 6. Phase-5 physical split checklist (only when you choose to run it)

1. `git tag pre-monorepo` (rollback point).
2. Add `frontend/package.json` (this package) and move `app lib components public types` →
   `frontend/src/…`.
3. Update `tsconfig.json` paths (`@/*` → `frontend/src/*`) and `next.config.mjs` root.
4. Move `tests/` and `vitest.config.ts` under `frontend/`; keep the CLI green before proceeding.
5. Add root `package.json` (this package) and run `npm install` for the workspace link.
6. Move `services/analytics` → `backend/` **only if** parity tests pass; otherwise leave it.
7. Update `Dockerfile` COPY lines marked `FRONTEND-ROOT` and `docker-compose.yml` contexts.
8. Re-run all five gates; update `CHANGELOG.md`; merge.
