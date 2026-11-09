# Feature requirements — 30 platform capabilities

Each block: purpose → inputs → outputs → acceptance criteria → edge cases → implementation →
status. "EXISTS" means the feature is implemented in the current repository and covered by
tests; nothing here is aspirational.

---

## 1. Universal data upload & ingestion · EXISTS
*Purpose:* get any reasonable cricket file into a validated workspace.
*Inputs:* CSV, XLSX, JSON, TXT, PDF (text layer); several files per request.
*Outputs:* `Dataset` + `DatasetRecord[]` with per-row issues; upload summary.
*AC:* accepted types parse server-side; unsupported/oversized files return a typed error and
persist nothing; the response reports rows parsed, errors and warnings.
*Edge:* empty file, header-only file, duplicate headers, BOM, non-UTF8, 25 MB+ file, 50k+ rows.
*Implementation:* `app/api/upload/route.ts` → `lib/core/data/{parse,extract}.ts`.
*Tests:* `tests/data.test.ts` (messy headers, impossible dates, unknown columns).

## 2. Universal cricket data intelligence · EXISTS
*Purpose:* understand unfamiliar schemas without renaming columns by hand.
*Inputs:* header list + sample rows.
*Outputs:* mapping of source header → platform field, confidence per mapping, unmapped list.
*AC:* synonym dictionary covers runs, balls, SR, avg, wickets, economy, DOB, role, state;
unmapped headers are preserved in `unknownFields`, never dropped.
*Implementation:* `lib/core/data/synonyms.ts`; mapping summary stored on the dataset.

## 3. Data preview & correction · EXISTS
*Purpose:* fix bad rows before they reach analytics.
*Inputs:* dataset id + record id + corrected values.
*Outputs:* updated record with new version and audit entry.
*AC:* edits keep provenance; invalid values rejected with field-level messages; edited rows
require re-approval if they were already approved.
*Implementation:* `app/api/records/[id]/route.ts`, `GET /api/datasets/[id]`.

## 4. Multi-file upload & intelligent merging · EXISTS
*Purpose:* combine batting + bowling + age sheets into one player record.
*Inputs:* 2+ datasets, join key (name/state/DOB), tolerance settings.
*Outputs:* merged dataset with conflict report.
*AC:* conflicts beyond tolerance are flagged rather than averaged; merging the same inputs
twice produces the same output (idempotent); missing values stay `null`.
*Implementation:* `app/api/merge/route.ts` → `lib/core/data/merge.ts`.

## 5. Cricket performance intelligence · EXISTS
*Purpose:* one defensible profile per player.
*Inputs:* approved player record + match log.
*Outputs:* batting/bowling rate metrics, phase splits, form (last 5), consistency, all-rounder
index — each with sample size.
*AC:* every rate declares its denominator; no balls faced ⇒ `null` SR (never `0`); phase splits
sum to the innings total.
*Implementation:* `lib/core/players/metrics.ts`, `app/api/players/[id]/route.ts`.

## 6. Young talent discovery · EXISTS
*Purpose:* find uncapped players under an age ceiling for the RR brief.
*Inputs:* max age, role filters, uncapped flag, competition, weights.
*Outputs:* ranked rows with score, confidence, age headroom, role gaps, sensitivity report.
*AC:* age filter is strict (`>` excludes); percentile recomputed inside the filtered cohort;
results carry count per role; empty result returns an explainable message, not a blank table.
*Implementation:* `POST /api/talent` → `lib/core/ranking/{engine,presets}.ts`.

## 7. Player ranking & decision engine · EXISTS
*Purpose:* configurable, explainable ordering of players.
*Inputs:* metric weights, filters, cohort definition.
*Outputs:* percentile per metric, weighted score, coverage, rank movement under weight changes.
*AC:* a missing metric yields `null` percentile and 0 contribution (no imputation); score is
bounded; identical input ⇒ identical ranking; sensitivity block lists weight → rank effect.
*Implementation:* `POST /api/rank`; engine shared with talent discovery.

## 8. Player comparison · EXISTS
*Purpose:* side-by-side evaluation with honest context.
*Inputs:* 2–8 player ids.
*Outputs:* radar series, metric table with percentile context, replacement simulator.
*AC:* rejects 1 or 9+ ids with a clear message; mixed roles produce a like-for-like warning;
percentiles are computed against the whole cohort, not the compared subset.
*Implementation:* `POST /api/compare`, `app/(app)/compare/page.tsx`.

## 9. Statistical performance & consistency · EXISTS
*Purpose:* rigorous statistics on any numeric column.
*Inputs:* values or a metric selection, window, significance level.
*Outputs:* mean/median/sd/IQR, normalised series, regression coefficients, correlations,
outlier indices, confidence intervals — each with method notes.
*AC:* single value ⇒ sd/CI `null` not `0`; Spearman handles ties; OLS reports r²; the UI prints
the method and assumptions; `/stats` labels the source of the series.
*Implementation:* `lib/core/stats/{descriptive,probability}.ts`, `POST /api/stats`.

## 10. Team & squad intelligence · EXISTS
*Purpose:* expose structural squad problems before the auction does.
*Inputs:* team id + squad + all players + fixtures.
*Outputs:* balance score, phase coverage, weaknesses with evidence, P1–P3 priority gaps.
*AC:* at least one weakness is always explained; recommendations are prioritised and each
carries a reason; empty squad returns guidance rather than a crash.
*Implementation:* `lib/core/team/squad.ts`, `GET /api/team/[id]`.

## 11. Auction simulation · EXISTS
*Purpose:* rehearse an auction with real budget constraints.
*Inputs:* pool, purse, bid rules, seed, optional rival tendencies.
*Outputs:* sale order, prices, final squads, purse remaining, unmet needs.
*AC:* same seed ⇒ identical outcome; a team cannot exceed its purse; squads respect the
overseas cap; the run records its seed for replay.
*Implementation:* `lib/core/auction/sim.ts`, `POST /api/auction`.

## 12. Player discovery & recommendations · EXISTS
*Purpose:* targeted recruitment missions.
*Inputs:* region, role, age band, budget, weighting.
*Outputs:* ranked hits with verification status (`verified` / `unverified` / `requires trial`) and
a rationale sentence per hit.
*AC:* every hit names the evidence used; no hit can appear without a workspace record.
*Implementation:* `lib/core/scouting/global.ts`, `POST /api/scouting`, `/scouting`, `/talent`.

## 13. Player risk & reliability · EXISTS
*Purpose:* separate "good on average" from "reliable when it matters".
*Inputs:* player metrics + availability + sample size.
*Outputs:* risk score 0–100, band, component breakdown, notes.
*AC:* components are listed with their contribution; low sample size raises uncertainty rather
than lowering risk silently; band thresholds are documented.
*Implementation:* `lib/core/players/risk.ts`.

## 14. Visualization & intelligence dashboard · EXISTS
*Purpose:* a single command view.
*Inputs:* workspace aggregate.
*Outputs:* KPI tiles, trust score, dataset quality alerts, recent fixtures, AI budget, sparkline.
*AC:* loading, empty and error states; every tile names its source; the demo badge is visible.
*Implementation:* `GET /api/overview`, `app/(app)/dashboard/page.tsx`, `components/charts.tsx`.

## 15. Cricket research & external intelligence · EXISTS
*Purpose:* keep scouting notes searchable with citations.
*Inputs:* documents (uploaded or seeded), query.
*Outputs:* ranked chunks with source ids and a knowledge-gap indicator.
*AC:* answers cite chunk ids; gibberish returns zero results; an empty library explains how to
add documents.
*Implementation:* `lib/core/knowledge/search.ts` (BM25), `GET /api/knowledge`, `/research`.

## 16. Match & situational analysis · EXISTS
*Purpose:* understand how a player performs in phases and match-ups.
*Inputs:* fixtures + ball events.
*Outputs:* phase profiles, batter-vs-bowler match-ups, situational breakdowns.
*AC:* match-ups derive from `match.events` (never positional slicing); sparse scorecards are
reported as sparse.
*Implementation:* `lib/core/sim/match.ts`, `app/(app)/match/page.tsx`.

## 17. Pitch, venue & weather intelligence · EXISTS
*Purpose:* adjust plans for conditions.
*Inputs:* venue, weather observation, stored matches.
*Outputs:* venue DNA (batting/bowling tilt, phase behaviour), toss strategy with confidence,
surface what-ifs.
*AC:* every insight carries an evidence tag and the number of matches behind it; below the
confidence threshold the engine says so instead of guessing.
*Implementation:* `lib/core/pitch/venue.ts`, `POST /api/pitch`, `/pitch`.

## 18. Playing XI & combination optimization · EXISTS
*Purpose:* generate a legal, balanced XI.
*Inputs:* squad, overseas limit, keeper requirement, seed.
*Outputs:* XI, batting order, 20-over bowling plan, bench, constraint checks.
*AC:* exactly 11; overseas/keeper constraints honoured; ≥5 bowlers with ≤4 overs each; same
seed ⇒ same XI; infeasible constraints return an explanation.
*Implementation:* `lib/core/team/xi.ts`, `POST /api/xi`, `/xi`.

## 19. Opposition scouting · EXISTS
*Purpose:* pre-match plan.
*Inputs:* opponent team id + fixtures.
*Outputs:* form, key threats, dependency indicators, phase plan, head-to-head match-ups.
*AC:* the report is labelled as inference; anything unavailable says so explicitly.
*Implementation:* `lib/core/team/opposition.ts`, `POST /api/opposition`, `/opposition`.

## 20. Predictive analytics & Monte Carlo · EXISTS
*Purpose:* probability, not certainty.
*Inputs:* two teams, simulations count, seed.
*Outputs:* win probabilities (sum 1), score bands/quantiles, forecast-quality score (Brier/log
loss) against stored fixtures.
*AC:* probabilities sum to 1 within 1e-9; seeded runs reproduce exactly; the method and its
limits are printed with the result.
*Implementation:* `lib/core/sim/match.ts`, `POST /api/predict`, `/prediction`.

## 21. Auction market intelligence & valuation · EXISTS
*Purpose:* defensible bid ceilings.
*Inputs:* player, role scarcity, team need, market context.
*Outputs:* fair value, value band, ordered bid ceilings, caveats.
*AC:* ceilings are strictly ordered; the band contains fair value; scarcity/need effects move
values monotonically; caveats always present.
*Implementation:* `lib/core/auction/valuation.ts`, `GET /api/auction`, `/auction`.

## 22. Career trajectory & development · EXISTS
*Purpose:* project a player's next seasons — only when there is history.
*Inputs:* season series.
*Outputs:* projected curve, development notes, uncertainty.
*AC:* with no season series, returns zero forecasts + an explicit "insufficient history" note
(verified by test); projections are labelled MODEL.
*Implementation:* `lib/core/career/trajectory.ts`.

## 23. Automated reports & presentations · EXISTS
*Purpose:* package analysis for a room.
*Inputs:* report type, subject (player/team/venue/talent), options.
*Outputs:* saved report with sections, sources, quality gate, open issues; exports in
PDF/DOCX/XLSX/PPTX/MD/HTML.
*AC:* every section has evidence or an explicit caveat; quality < threshold shows the failed
checks; all six exports return a real file (verified sizes in smoke).
*Implementation:* `lib/core/reporting/{build,export}.ts`, `/api/reports`, `/api/reports/[id]/export`.

## 24. Workload & player management · EXISTS
*Purpose:* avoid over-bowling a player across competitions.
*Inputs:* match log + reference date + rolling windows.
*Outputs:* matches/balls last 21 days, acute:chronic ratio, workload index, rotation guidance.
*AC:* no medical diagnosis; missing chronic baseline ⇒ `null` ratio + explanation; the
disclaimer is always rendered.
*Implementation:* `lib/core/workload/engine.ts`, `GET /api/workload`, `/workload`.

## 25. Global cricket talent scouting · EXISTS
*Purpose:* widen the funnel beyond one competition.
*Inputs:* region, age, role, competition filters.
*Outputs:* mission results with verification status and source coverage.
*AC:* unverified hits are labelled; the mission records its filters so it can be re-run.
*Implementation:* `lib/core/scouting/global.ts`, `/scouting`.

## 26. Data quality & verification · EXISTS
*Purpose:* trust the dataset before trusting the analysis.
*Inputs:* dataset + records.
*Outputs:* completeness/consistency score, error/warning counts, issue list by severity.
*AC:* score bounded 0–100 and reproducible; blocking errors prevent approval; approval is
permission-gated (owner/analyst) and audited.
*Implementation:* `lib/core/data/quality.ts`, `GET /api/datasets/[id]/quality`.

## 27. Natural language analytics · EXISTS
*Purpose:* ask questions in words, get engine-backed answers.
*Inputs:* free text (EN/HI/GU phrasing) + role + session.
*Outputs:* intent, entities, answer text, evidence block, `confirmRequired` for writes.
*AC:* no invented player names; write intents never execute without confirmation; unknown
intent returns a helpful fallback listing capabilities.
*Implementation:* `lib/core/ai/{nlq,assistant}.ts`, `POST /api/assistant`, `/assistant`.

## 28. AI agents & workflow automation · EXISTS
*Purpose:* chain analysis steps with human control.
*Inputs:* workflow definition, scope, approvals.
*Outputs:* run record with step log, outputs, approvals.
*AC:* least-privilege scopes; a write step cannot run without a recorded approval; failures stop
the run and are logged with the failing step.
*Implementation:* `lib/core/ai/agents.ts`, `/api/workflows`, `/automation`.

## 29. Knowledge base & research library · EXISTS
*Purpose:* institutional memory.
*Inputs:* documents with metadata, query.
*Outputs:* citations, related docs, coverage gaps.
*AC:* citations resolvable; chunking is stable for the same document; empty queries rejected.
*Implementation:* `lib/core/knowledge/search.ts`, `/research`, `GET /api/knowledge`.

## 30. Security, privacy & governance · EXISTS
*Purpose:* keep private performance data private and every change traceable.
*Inputs:* credentials, roles, requests.
*Outputs:* sessions, audit entries, posture score, usage/cost log.
*AC:* scrypt + salt hashing; HttpOnly session cookie; lockout after 5 failures; TOTP optional;
RBAC on every write; private routes noindex and session-gated; secrets never returned to the
client; posture score never claims 100 and lists gaps.
*Implementation:* `lib/core/auth/*`, `lib/core/security/*`, `middleware.ts`, `/settings`.

---

### Cross-cutting acceptance criteria (apply to all 30)
1. Loading, empty and error states on every screen.
2. Provenance/confidence visible wherever a number is presented.
3. Deterministic for identical inputs (seeded where random).
4. Permission check on every write; audit entry on every mutation.
5. Unit tests for maths; smoke coverage for the wire.
