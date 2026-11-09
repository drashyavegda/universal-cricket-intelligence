# PRD — Universal AI Cricket Intelligence, Analytics, Scouting & Auction Strategy Platform

| Field | Value |
| --- | --- |
| Product | UCIP (Universal Cricket Intelligence Platform) |
| Version | 1.1.0 (structure package) · application 1.0.0 |
| Owner | Product & Analytics |
| Primary pilot customer | Rajasthan Royals — IPL 2027 scouting & auction workspace |
| Status | v1.0 features implemented and tested; v1.1 adds website/SEO/trust layer + deployment scaffolds |
| Last updated | 2026-11-09 |

---

## 1. Problem statement

Cricket decisions — who to scout, who to bowl in the 17th over, what to bid at an auction —
are made from fragmented spreadsheets, memory and highlight reels. Existing tools either
give raw scorecards with no decision layer, or an opaque "AI rating" nobody can defend in a
selection meeting.

UCIP's bet: **deterministic analytics first, narration second.** Every number is computed by
an inspectable engine from approved data, carries its sample size and provenance, and is
explained in prose by an AI layer that is not allowed to compute or invent anything.

## 2. Users and jobs to be done

| Persona | Role in app | Primary jobs | Success looks like |
| --- | --- | --- | --- |
| Scouting analyst (RR) | `analyst` | Ingest trial/domestic data, rank uncapped talent, build shortlists | A defensible 10-player brief in under an hour, with caveats attached |
| Head coach / director | `owner` | Approve data, sanity-check XI combinations, read reports | One-page deck that answers "why this player, why now" |
| Auction strategist | `analyst` | Model purses, bid ceilings, scarcity, scenarios | Bid ceilings per role that survive a re-run of the simulation |
| Data engineer | `owner` | Upload, map, validate, merge, monitor quality | Every metric traces back to an approved row |
| Viewer / stakeholder | `viewer` | Read dashboards and reports | No accidental edits; no exposure of raw data |
| Platform admin | `owner` | Roles, sessions, audit, AI budget, testimonials, feedback | Traceable history of who changed what |

## 3. Goals

1. One workspace where ingestion, player intelligence, team/auction strategy, prediction and
   reporting share a single data model, so a scout's shortlist and the auction ceiling cannot
   drift apart.
2. Evidence discipline: sample sizes, confidence, provenance and disclaimers appear next to
   every estimate; nothing is imputed silently.
3. Deterministic and reproducible: seeded simulations, fixed reference date, identical output
   for identical input — defensible in a room.
4. Deployable by a small team: zero paid services required to run; every paid/third-party
   integration optional and off by default.
5. Trustworthy public surface: real privacy policy, honest FAQ, labelled testimonials,
   spam-hardened forms, search-engine hygiene that never leaks private data.

## 4. Non-goals

* Live ball-by-ball scoring or a streaming feed.
* Betting odds, tips or gambling surfaces.
* Medical diagnosis, injury clearance or return-to-play certification.
* Scraping proprietary data sources or redistributing official league data.
* Payments, subscriptions or seat licensing (single-workspace deployment).
* Replacing selectors — outputs are decision support, explicitly not guarantees.

## 5. Functional requirements — 30 platform features

Acceptance criteria are testable statements. "Deterministic" means: same inputs + same seed
⇒ byte-identical numbers.

### Data foundation
**FR-1 Universal upload & ingestion.** Accept CSV, XLSX, JSON, PDF (text layer) and TXT,
multiple files per upload, up to the configured size/row caps. *AC:* each accepted type
produces a dataset row with file metadata; oversize/unsupported files return a typed error
and store nothing; parsing runs server-side.
**FR-2 Universal cricket data intelligence.** Map arbitrary source headers to platform
fields using a synonym dictionary; unmappable headers are preserved, never dropped silently.
*AC:* mapping report lists mapped/unmapped columns; re-import reuses the stored mapping.
**FR-3 Data preview & correction.** Preview parsed rows, edit a record, see validation issues
per field. *AC:* edits are versioned; an edited record keeps its provenance; invalid values are
rejected with a field-level message.
**FR-4 Multi-file upload & intelligent merging.** Merge related files (e.g. batting + bowling
sheets) into one dataset. *AC:* conflicting values beyond tolerance are flagged, not averaged;
merge output is idempotent for the same input set.
**FR-5 Data quality & verification.** Score completeness/consistency; list open issues.
*AC:* score is bounded 0–100 and reproducible; blocking errors prevent approval; approval is
permission-gated and audited.

### Player intelligence
**FR-6 Cricket performance intelligence.** Per-player phase splits, rate metrics, form,
consistency, all-rounder index. *AC:* every rate metric declares its denominator; a player
with no balls faced reports `null`, never `0`.
**FR-7 Young talent discovery.** Age-banded, role-filtered, uncapped-eligible search with
headroom weighting. *AC:* age filter is strict; results carry confidence and sample size.
**FR-8 Player ranking & decision engine.** Percentile ranking with configurable metric
weights and presets. *AC:* missing metric ⇒ null percentile and reduced coverage, never a
free pass; sensitivity report shows rank movement under weight changes.
**FR-9 Player comparison.** 2–8 players side by side with percentile context. *AC:* handles
mixed roles; states when a comparison is not like-for-like.
**FR-10 Statistical performance & consistency.** Descriptive stats, regression, correlation,
outlier detection, normalisation, confidence intervals. *AC:* methods and assumptions are
printed with results; single observations produce `null` variance/sd.
**FR-11 Player risk & reliability.** Composite risk with components and band. *AC:* risk
inputs are listed; the reason a player is flagged is always shown.
**FR-12 Career trajectory.** Projection from season series. *AC:* without a season series the
engine returns zero forecasts plus an uncertainty note — it never fabricates a curve.
**FR-13 Visualisation & intelligence dashboard.** Workspace KPIs, trust score, alerts, recent
fixtures, AI budget. *AC:* empty and error states are rendered, not blank panels.

### Team, auction & match
**FR-14 Team & squad intelligence.** Balance, phase coverage, structural weaknesses,
prioritised gaps (P1–P3), purse position. *AC:* each weakness cites evidence and a suggestion.
**FR-15 Auction simulation.** Seeded virtual auction with purse scenarios. *AC:* same seed ⇒
same sale order; the room cannot overspend a purse.
**FR-16 Auction market intelligence & valuation.** Value range, fair value, ordered bid
ceilings, scarcity and need adjustments with caveats. *AC:* ceilings are ordered; the band
contains fair value; caveats always present.
**FR-17 Playing XI & combination optimisation.** Constraint-satisfying XI. *AC:* exactly 11
players, overseas/keeper limits honoured, 20-over plan uses ≥5 bowlers with ≤4 overs each.
**FR-18 Match & situational analysis.** Phase profiles and batter-vs-bowler match-ups from
ball events. *AC:* match-ups are computed from `m.events`, never by positional slicing.
**FR-19 Pitch, venue & weather intelligence.** Venue DNA, toss strategy, surface what-ifs.
*AC:* every insight carries an evidence tag and the number of matches behind it.
**FR-20 Opposition scouting.** Form, threats, dependency indicators, phase plans. *AC:* the
report is labelled inference, not inside knowledge.
**FR-21 Predictive analytics & Monte Carlo.** Seeded simulation with win probability and
score bands. *AC:* probabilities sum to 1; forecast quality (Brier/log-loss) is reported
against stored fixtures.
**FR-22 Global talent scouting.** Region/role/age missions with verification status.
*AC:* every hit says whether it is verified, unverified or requires a trial.
**FR-23 Workload & player management.** Rolling load windows and acute:chronic ratio.
*AC:* no medical diagnosis; missing chronic baseline ⇒ `null` ratio + explanation.

### Narration, research & operations
**FR-24 Automated reports & presentations.** Multi-section report with a quality gate.
*AC:* sections carry evidence and caveats; export to PDF/DOCX/XLSX/PPTX/MD/HTML from the same
saved report.
**FR-25 Knowledge base & research library.** Chunked document store with BM25 retrieval and
citations. *AC:* answers cite chunk ids; gibberish queries return nothing rather than noise.
**FR-26 Natural language analytics.** Intent + entity extraction routed to the deterministic
engine. *AC:* no invented player names; write intents require explicit confirmation.
**FR-27 AI agents & workflow automation.** Least-privilege scopes with human approval gates.
*AC:* a workflow cannot write without an approval step recorded in the run log.
**FR-28 AI narrative layer.** Prose over computed facts, provider-agnostic. *AC:* with no key,
returns a labelled deterministic fallback; never emits a number absent from the evidence.
**FR-29 Security, privacy & governance.** RBAC (owner/analyst/scout/viewer), audit trail,
session controls, 2FA, prompt-injection guard, security posture score. *AC:* anonymous reads
of private routes/APIs are rejected; every write is audited; posture score never claims 100.
**FR-30 Settings & platform configuration.** AI provider config, limits, reference date,
testimonials, feedback inbox. *AC:* secrets are write-only; the UI shows `hasApiKey` boolean.

## 6. Functional requirements — 14 website quality features

| ID | Requirement | Acceptance criteria |
| --- | --- | --- |
| WF-1 | Branded 404 | Returns HTTP 404 with navigation and ≥4 recovery routes |
| WF-2 | Unique page titles | No duplicates across pages (test-enforced); player titles derived from the record |
| WF-3 | Unique meta descriptions | 70–160 characters, no duplicates (test-enforced) |
| WF-4 | OG/Twitter cards | Default branded 1200×630 PNG + dynamic player card; `og:image:width/height` emitted |
| WF-5 | Internal linking & breadcrumbs | Every deep page reachable within 2 clicks; no loops or dead ends |
| WF-6 | XML sitemap | Public pages only; private prefixes absent (test-enforced) |
| WF-7 | robots.txt | Disallows all private routes and `/api/`; references absolute sitemap |
| WF-8 | HTTPS & secure headers | HSTS over TLS, nosniff, referrer policy, permissions policy; session cookie HttpOnly/Secure |
| WF-9 | Spam protection | Server validation, rate limit, honeypot, timing, duplicate suppression, optional CAPTCHA |
| WF-10 | Thank-you flow | Confirmation only with a server-issued reference; separate failure state |
| WF-11 | GA4 events | Consent-gated; allowlisted params only; no player/email/file data |
| WF-12 | Privacy policy | Covers data, purpose, storage, retention, protection, cookies, analytics, datasets, third parties, deletion |
| WF-13 | Searchable FAQ | ≥20 answers across ≥6 categories + visible plain-HTML answers |
| WF-14 | Testimonials | Owner-only CRUD; sample rows visibly labelled; no fabricated endorsements |

## 7. Non-functional requirements

| Area | Requirement |
| --- | --- |
| Performance | Dashboard first paint < 2.5 s on a 4× throttled connection with the demo dataset; analytics endpoints < 800 ms p95 for 190 players |
| Determinism | Seeded simulations and fixed `REFERENCE_DATE`; identical inputs ⇒ identical outputs |
| Availability | Single-node deployment acceptable; health endpoint `/api/health` (web) and `/health` (backend) |
| Security | Strict TypeScript, RBAC on every write, audit trail, no secrets client-side, security headers |
| Privacy | No third-party analytics without consent; datasets never leave the deployment by default |
| Accessibility | Keyboard operable, visible focus, labelled form controls, ≥ 4.5:1 contrast on body text |
| Observability | Structured request logs, audit trail, AI usage/cost counters, error envelopes |
| Portability | Runs with `npm install && npm run seed && npm run dev`; no paid service required |
| Localisation | English UI; assistant understands EN/HI/GU query phrasing |

## 8. Data policy

* **Synthetic demo records** carry `synthetic: true` and render a `DEMO` badge.
* **Uploaded records** require explicit approval before they feed analytics; provenance is
  retained per record.
* **Model outputs** are labelled `MODEL` and always show the input evidence.
* Player names in demo mode come from name pools and represent no real person.

## 9. Success metrics (pilot)

| Metric | Target |
| --- | --- |
| Time to produce an RR uncapped shortlist | ≤ 60 min from raw files |
| Shortlist accepted by coaching staff without rework | ≥ 70% of briefs |
| Metrics with visible provenance | 100% |
| Auction ceiling re-run variance at fixed seed | 0 |
| Public site: indexed private URLs | 0 |
| Spam messages reaching the inbox | < 1 per 1,000 submissions |

## 10. Release criteria for v1.1

1. `tsc --noEmit` clean, 168 vitest tests, 15 pytest tests, 58 smoke checks green.
2. `npm run build` succeeds with no prerender errors.
3. All 20 workspace pages 200 authenticated, 307 anonymous.
4. Sitemap/robots/OG verified against a running production build.
5. Documentation set complete (this PRD, blueprint, architecture, API, schema, deployment,
   env vars, security, testing, contributing, changelog).
6. Known gaps published in `FILES_TO_IMPLEMENT.md`, not hidden.
