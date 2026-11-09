# Contributing

Thanks for improving UCIP. This project values **defensible numbers** over feature velocity:
a smaller feature that can be explained beats a bigger one that cannot.

---

## 1. Set up

```bash
git clone <repo> && cd Universal-Cricket-Intelligence-Platform
npm install
npm run seed                 # deterministic demo workspace
npm run dev                  # http://localhost:3000
cd services/analytics && pip install -r requirements.txt && cd -
```

Requirements: Node 20.20.2+, npm 10.8+, Python 3.11+ (3.13 tested). No paid service is needed.

## 2. Before you push — the five gates

```bash
npm run typecheck            # tsc --noEmit, strict
npm test                     # vitest (151 tests today)
npm run test:py              # pytest in services/analytics
npm run build                # next build must succeed
npm run smoke                # against a running `npm start`
```

A PR that lowers any of these numbers is not ready.

## 3. Branch and commit conventions

* Branches: `feat/<area>-<short>`, `fix/<area>-<short>`, `docs/<topic>`, `chore/<topic>`.
* Commits: Conventional Commits — `feat(auction): add reserve-price scenario`,
  `fix(data): reject impossible dates`, `docs(api): document feedback endpoints`.
* One logical change per commit; reference the issue in the body.

## 4. Code style

**TypeScript**
* `strict` is on; no new `any`, no non-null assertions to silence a real possibility of `null`.
* Server code lives in `app/api/**` (HTTP) and `lib/core/**` (domain). Never import React into
  `lib/core`.
* Zod schemas at every public HTTP boundary.
* Prefer `null` for "unknown" — `0` means zero.

**Python**
* Type hints on public functions, `from __future__ import annotations`.
* Pure functions in `compute.py`-style modules; FastAPI only does validation and transport.
* No global mutable state in request paths.

**UI**
* Reusable primitives come from `components/ui.tsx`; a new bespoke button is a review block.
* Every data-driven screen renders loading, empty and error states.
* Numbers carry units, sample size or a caveat — no bare "score: 87".

## 5. Adding a feature — checklist

1. Read `PRD.md` for the requirement id (FR-x / WF-x) you are satisfying.
2. Put maths in `lib/core/<area>/` with a unit test next to it.
3. Add the API route with `guard(permission)` and typed errors.
4. Add the page under `app/(app)/<route>/` **plus** a `layout.tsx` with title/description and
   `robots: noindex`.
5. Register any new public page in `lib/site.ts` (uniqueness tests will fail otherwise).
6. Add provenance/caveat to the UI and update `docs/architecture/FEATURE_MODULE_MAP.md`.
7. Update `CHANGELOG.md` under "Unreleased".

## 6. Adding a dependency

Open an ADR in `docs/decisions/` (`ADR-000N-<slug>.md`) answering: what we needed, what we
tried, why this package, bundle/runtime cost, licence, and the exit plan. The project
deliberately has a small dependency surface — `jszip` and `pdf-lib` were added only because
report exports needed them.

## 7. Data and secrets

* Never commit `.env*` (except `.env.example`), datasets, or generated reports.
* Demo data must stay synthetic and labelled `DEMO`.
* New sample files go in `sample-data/` with a README line describing them as synthetic.
* Never log email addresses, raw IPs or full request bodies; use the existing `ipHint()` hash.

## 8. Review process

* Two approvals for anything touching `lib/core/**` maths or `lib/core/auth/**`.
* Reviewer checks: tests added, caveats present, no secrets, permission guard on writes,
  docs updated, and that the PR does not claim unimplemented behaviour.
* Squash-merge to `main`; `main` must always be deployable.

## 9. Reporting security issues

Do **not** open a public issue. Use the contact form's "Bug report" category or the address in
`docs/security/SECURITY_PRACTICES.md`, and allow 5 working days for a response.
