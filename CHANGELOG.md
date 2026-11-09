# Changelog

All notable changes to this project are documented here.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) · Versioning: [SemVer](https://semver.org/).

---

## [1.1.0-structure] — 2026-11-09

Structure, deployment and documentation package generated from an inspection of the working
application. **No application behaviour changed by this package.**

### Added
- Complete documentation set: `PRD.md`, `PROJECT_BLUEPRINT.md`, `ARCHITECTURE.md`,
  `ROADMAP.md`, `CONTRIBUTING.md`, `MIGRATION_MAP.md`, `FILES_TO_IMPLEMENT.md`, and 24 files
  under `docs/` (requirements, architecture, database, api, deployment, security, testing,
  user guides, 8 ADRs).
- Target folder architecture mapped to real modules; every path labelled EXISTS / NEW / PLANNED
  in `PROJECT_STRUCTURE.json`.
- `frontend/` layer map: 16 feature folders with scope, acceptance criteria and implementation
  pointers; component taxonomy; public asset folders (`images/ icons/ logos/ fonts/ favicon/`);
  `config/`, `constants/`, `utils/`, `types/` starters.
- `backend/` FastAPI scaffold that extends `services/analytics`: settings, logging, CORS
  allow-list, request-id middleware, typed error envelope, health router, statistics router,
  worker entrypoint, tests, `requirements.txt`, `Dockerfile`.
- `infrastructure/` templates for Vercel, Render, Docker, database, storage, monitoring and CI/CD.
- Deployment docs for Vercel + Render + Supabase + object storage, including CORS, API URL
  configuration, health checks, production build steps and a troubleshooting matrix.
- `security/`, `analytics/`, `data/`, `reports/`, `marketing-seo/`, `legal/` areas with real
  content (policy catalogues, JSON Schemas, GA4 event catalogue, cookie inventory, disclaimers).
- CI workflows: typecheck + unit tests + Python tests + build; dependency/secret scan; release notes.
- Shell scripts under `scripts/{development,deployment,database,testing,maintenance}`.

### Verified
- 44 API routes, 29 pages, 25 layouts, 40 `lib/core` modules enumerated and mapped.
- Existing test suite status recorded: 151 TypeScript tests, 11 Python tests, 58 smoke checks,
  clean `tsc --noEmit`, successful production build.
- JSON/YAML/TOML syntax of every generated config validated; no duplicate or conflicting paths
  with the existing repository (see `MIGRATION_MAP.md`).

## [1.0.0] — 2026-11-09

First complete release of the application, including the website quality/SEO/trust module.

### Added — platform (30 features)
- Data: multi-format ingestion (CSV, XLSX, JSON, text, PDF text layer), synonym-based column
  mapping, row-level validation, multi-file merge, quality scoring, approval workflow, provenance.
- Player intelligence: phase splits, rate metrics, form/consistency, all-rounder index,
  percentile ranking with configurable presets, risk and reliability bands, career trajectory
  (refuses to fabricate without a season series), comparison lab.
- Team & auction: squad balance and P1–P3 gaps, constraint-satisfying XI optimiser with 20-over
  bowling plan, valuation with ordered bid ceilings, seeded virtual auction room, purse planning.
- Match & conditions: venue DNA with evidence tags, toss strategy, opposition report, seeded
  Monte Carlo prediction with forecast-quality scoring, batter-vs-bowler match-ups.
- Operations: workload engine with acute:chronic ratio (no medical claims), global scouting
  missions with verification status, knowledge base with BM25 retrieval and citations,
  natural-language analytics with write-intent confirmation, multi-agent workflows with approval
  gates, reports with a quality gate exported to PDF/DOCX/XLSX/PPTX/MD/HTML.
- Security & governance: scrypt hashing, server-side sessions, TOTP 2FA, four-role RBAC, audit
  trail, prompt-injection guard, security posture score with honest gaps, AI budget and usage log.

### Added — website quality, SEO, trust & growth (14 features)
- Branded 404, unique titles/descriptions via `lib/site.ts`, OG/Twitter cards with a generated
  1200×630 branded image and dynamic player share cards, breadcrumbs and internal linking,
  public-only XML sitemap, robots.txt blocking every private route, HTTPS/HSTS/security headers,
  spam-hardened public contact form, three-state thank-you page, consent-gated GA4, privacy
  policy, searchable 22-answer FAQ with FAQPage JSON-LD, testimonials with owner-only CRUD and
  visibly labelled sample rows.
- Workspace moved to `/dashboard`; public landing page added; private routes now double-gated
  (middleware + server-side session validation) with `noindex` meta and `X-Robots-Tag`.

### Added — engineering
- `Dockerfile` (multi-stage, non-root, healthcheck), `docker-compose.yml`, `vercel.json`,
  `render.yaml`, `.env.example`, `.dockerignore`.
- `scripts/seed.ts` (deterministic demo workspace), `scripts/smoke.mjs` (58 end-to-end checks).
- Documentation: `FEATURE_GUIDE.md`, `ARCHITECTURE.md`, `DATABASE_SCHEMA.md`,
  `API_DOCUMENTATION.md`, `SECURITY.md`, `TESTING.md`, `DEPLOYMENT.md`, `SEO_AND_TRUST.md`.

### Fixed
- Assistant executed consequential write requests without confirmation (now requires approval).
- Career trajectory produced forecasts with no season series (now returns zero + explanation).
- Report export rejected DOCX/XLSX (now generates real OOXML files).
- 26 read endpoints were reachable without a session (now guarded).
- `/compare` failed the production build without a Suspense boundary (fixed).
- Landing/metadata inheritance dropped `og:image` and `twitter:card` when a page overrode
  Open Graph (fixed by always declaring the share image).

### Known gaps at 1.0.0
Real testimonials, GA4 property, CAPTCHA keys, production domain, search-console verification,
edge TLS/clickjacking headers, shared rate limiter, Postgres cutover, public report share pages.
