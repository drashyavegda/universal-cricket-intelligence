# Feature guide — all 30 capabilities

Every feature below is implemented in this repository and reachable from the running app.
Where a capability depends on data or a key you must supply, the guide says so explicitly.
Nothing here is a mock-up: each screen reads a real API route that calls a real engine.

Legend for **status**:
- **Live** — works out of the box in demo mode.
- **Live (needs your data)** — works, but is empty or thin until you upload the relevant data.
- **Live (needs your key)** — works in demo mode with deterministic output; a model key upgrades narration quality.

---

## 1. Universal data ingestion — *Live (needs your data)*
`/data` · `POST /api/upload`
CSV/TSV, XLSX, JSON, PDF (text layer), TXT/MD. SHA-256 hashing, duplicate-file detection,
per-file size limits, 25 MB / 50 000-row defaults, encrypted-PDF detection, delimiter sniffing,
BOM handling. Scanned PDFs are detected and labelled `pdf-ocr` with a warning — no OCR is
bundled, so the platform never pretends it read something it did not.

## 2. Intelligent column mapping — *Live*
`/data` · `lib/core/data/synonyms.ts`
A synonym dictionary plus Levenshtein/Jaccard matching maps `Player Name`, `Bat Style`,
`Runs Given`, `Wkts`, `Age (yrs)`… onto canonical fields. Confidence is shown per column.
Single-letter abbreviations only match exactly, and unrelated headers are left **unmapped**
rather than guessed — the fastest way to corrupt a cricket dataset is a silent bad mapping.

## 3. Validation & correction — *Live (needs your data)*
`/data` · `PATCH /api/records/[id]`
Per-cell issues (error/warn/info), plausibility bounds (age 12–60, runs ≤ 30 000), impossible
dates rejected instead of rolled over (`31/02/2005` → not a date), stated age vs DOB-derived
age conflicts flagged with DOB winning. Records can be approved, rejected, edited or reset;
every change bumps a version.

## 4. Multi-file merging — *Live (needs your data)*
`/data` · `POST /api/merge`
Identity matching on normalised names, numeric conflict detection with a tolerance
(`max(2, 2% of the larger value)`), unresolved conflicts kept `null` until a human decides,
and provenance retained per surviving field. Mixing formats or seasons produces an explicit warning.

## 5. Player intelligence profiles — *Live*
`/players/[id]`
Five tabs: overview (radar, ranking card, phase splits), evidence (per-metric provenance and
sample size), risk & value (components, drivers), career & forecasts, workload. Rates return
`null` — never `0` — when the denominator is missing.

## 6. Talent discovery — *Live*
`/talent` · `POST /api/talent`
Age-banded cohort, strategy presets, age-headroom weighting, sensitivity analysis
(Spearman correlation between the base ranking and perturbed weightings), role-gap analysis and
the IPL-2027-shaped "young uncapped domestic" brief. Age is a headroom multiplier, never the
primary signal.

## 7. Player comparison — *Live*
`/compare` · `POST /api/compare`
2–8 players, radar overlay, metric table with cohort percentiles, and a replacement simulator
that shows the squad-level effect of swapping one player for another.

## 8. Ranking & recommendation engine — *Live*
`/rank` (API) · `/talent`, `/players`
`score = Σ(wᵢ·percentileᵢ)/Σwᵢ`, rescaled by metric coverage, × `(0.82 + 0.18·reliability)`,
plus an explicit age bonus. Percentiles are recomputed **inside the filtered cohort** so
comparisons are like-for-like. Missing metrics are excluded and never imputed.

## 9. Analytics & statistics workbench — *Live*
`/stats` · `POST /api/stats` (+ optional Python service)
Describe, histogram, regression, correlation, outliers (IQR/z-score), moving average, z-scores,
min–max/robust normalisation, confidence intervals. Each operation ships its formula, the
assumption it needs, and a sample-size caveat.

## 10. Auction valuation & market intelligence — *Live*
`/auction` · `POST /api/auction`
Quality score, sample reliability, role scarcity, team need, competitor demand → fair value in
lakh, a value band, and three max-bid ceilings (conservative / balanced / aggressive).
Fair value is *never* presented as a hammer price, and the synthetic auction history is labelled.

## 11. Virtual auction room — *Live*
`/auction` (tab 2) · `lib/core/auction/sim.ts`
Seeded simulation with rival purses, bidding aggression, lot ordering and a live budget trace.
Same seed ⇒ same auction.

## 12. Reports & exports — *Live*
`/reports` · `POST /api/reports`, `GET /api/reports/[id]/export?format=`
Markdown, HTML, PDF (pdf-lib), DOCX (hand-built OOXML), XLSX (SheetJS), PPTX (pptxgenjs) and
CSV row exports. All six report formats were generated and byte-checked in this build.

## 13. AI narrative layer — *Live (needs your key)*
`lib/core/ai/gateway.ts` · Settings → AI provider
Provider-agnostic OpenAI-compatible gateway (also works with Anthropic-compatible relays and
local Ollama/vLLM). Without a key it returns deterministic templates labelled `demo`.
The model only receives already-computed numbers and is instructed not to add statistics.

## 14. Presentation generation — *Live*
`/reports` → PPTX
A 16:9 deck with a title slide, one slide per report section, evidence tables, a chart and a
mandatory method/disclaimer slide.

## 15. Team intelligence — *Live*
`/team` · `GET /api/team/[id]`
Balance score, batting/bowling depth, pace vs spin options, all-rounders, keepers, structural
weaknesses with evidence, phase coverage and purse position.

## 16. Best XI optimiser — *Live*
`/xi` · `POST /api/xi`
40 seeded restarts of constrained greedy construction plus pairwise local search. Hard
constraints: 11 players, overseas limit, keeper required, ≥5 bowling options, ≥5 batters,
max 4 overs per bowler. Five flavours (balanced / batting / bowling / young / matchup), a
batting order with rationales, a 20-over bowling plan and a constraint checklist. It returns a
*local* optimum and says so.

## 17. Match prediction — *Live*
`/prediction` · `POST /api/predict`
Per-ball hazard Monte Carlo (default 5 000 simulations, seeded), win/tie probabilities with
simulation error, score quantiles, phase forecasts, momentum by over and individual player
forecasts. The "Prediction quality" tab scores the same model on stored fixtures with Brier
score, log loss and a calibration table.

## 18. Opposition intelligence — *Live*
`/opposition` · `POST /api/opposition`
Form, role structure, key-player threat with counter-plans, dependency indicators, weaknesses,
phase-by-phase bowling/batting plans and head-to-head match-ups. The report states that it is
inference from public match data, not any team's private strategy.

## 19. Pitch & venue intelligence — *Live*
`/pitch` · `POST /api/pitch`
Historical aggregates, current weather observation, model inference and forecast are kept in
separate columns with an evidence tag. Venue DNA radar, toss strategy with confidence and
caveat, what-if surface sliders, and pitch-suitability rankings for batters/spinners/pacers.

## 20. Workload management — *Live*
`/workload` · `GET/POST /api/workload`
Matches and balls in rolling 21/90-day windows, acute:chronic ratio (null when chronic load is
missing), workload index 0–100, consecutive-match streaks, schedule congestion and rotation
suggestions. It explicitly does **not** diagnose injury and never declares a player fit.

## 21. Budget & purse planning — *Live*
`/auction` (tab 1) · `/team`
Purse allocation, bid ceilings per target, role-scarcity-adjusted priorities and a simulated
rival-purse tracker.

## 22. Predictive forecasting — *Live*
`/players/[id]` → Career & forecasts
Season-aggregate linear trends plus an age curve, three scenarios per horizon (conservative /
expected / high-growth). With no season series it returns **no** forecast and says why, rather
than extrapolating from one aggregate.

## 23. Automated reports — *Live*
`/automation` · `/reports`
Six builder types (player, talent, team, auction, pitch, statistical) with a quality gate:
evidence coverage, sample-size disclosure, demo-data labelling, stale-data checks and
unsupported-claim checks. Exports are blocked when the gate fails.

## 24. Knowledge base — *Live*
`/research` · `GET/POST /api/knowledge`
Chunked documents with BM25-lite retrieval (no embeddings service required), citations per
chunk, and a knowledge-gap detector.

## 25. Global scouting network — *Live*
`/scouting` · `POST /api/scouting`
Region / role / age missions, discovery score with a hidden-gem bonus for thin samples, and a
per-player verification status (`uploaded` / `external` / `demo`) so a synthetic record can
never masquerade as a scouted one.

## 26. Data quality scoring — *Live*
`/data` · `GET /api/datasets/[id]/quality`
Completeness, uniqueness, plausibility, freshness and mapping coverage, with the issues that
drove each score.

## 27. AI assistant (natural language) — *Live*
`/assistant` · `POST /api/assistant`
Rule-based parser (English/Hindi/Gujarati keywords) → structured query → deterministic engine →
optional model narration. Write-style verbs are routed to a `write_action` intent that
**requires explicit confirmation**; the assistant never writes on its own.

## 28. Multi-agent automation — *Live*
`/automation` · `GET/POST /api/workflows`
Eleven agents with least-privilege scopes, four workflow templates with dependency graphs and
human approval gates, per-step status and an audited run history.

## 29. Research library — *Live*
`/research`
Add your own strategy notes, tag them, and have every assistant answer cite the chunk it used.
Unsupported claims are never presented as citations.

## 30. Security, governance & digital twin — *Live*
`/settings` → Security posture
scrypt password hashing, server-side sessions, TOTP 2FA, RBAC on every route, per-IP rate
limiting, account lockout, prompt-injection guard, upload limits, append-only audit log,
tenant-scoped RLS policies in the SQL migration, and a threat simulator that explains what
breaks when a control is missing. The score is an engineering self-assessment — **no
certification is claimed**.

---

### What is deliberately *not* claimed

- No real cricket data is bundled. All 190 seed players, 12 fixtures and 12 venues are
  synthetic and labelled `DEMO`.
- No OCR. No live score API. No payment processing. No injury diagnosis. No security
  certification. No claim that the XI optimiser finds a global optimum.

---

## 31. Website quality, SEO, trust & growth (14 items)

Full detail: `docs/SEO_AND_TRUST.md`. Status column is honest about what needs you.

| # | Item | Status | Notes |
| --- | --- | --- | --- |
| 1 | Branded 404 with navigation | **Live, tested** | 6 recovery links, back button, report-a-link action |
| 2 | Unique page titles (+ dynamic player titles) | **Live, tested** | Registry + uniqueness test; player title from the record |
| 3 | Unique meta descriptions | **Live, tested** | 70–160 chars, no duplicates (test-enforced) |
| 4 | OG/Twitter + branded default + dynamic player card | **Live, tested** | 1200×630 PNG verified; `PUBLIC_PLAYER_PREVIEWS=false` for real data |
| 5 | Internal linking + breadcrumbs | **Live, tested** | Player → compare/stats/talent/auction/scouting/reports |
| 6 | XML sitemap of public pages only | **Live, tested** | 6 URLs; private prefixes excluded by construction |
| 7 | robots.txt | **Live, tested** | Private disallows + absolute sitemap reference |
| 8 | HTTPS redirect, secure cookies, security headers | **Live; edge TLS needs hosting config** | `ENFORCE_HTTPS` + HSTS; X-Frame-Options/CSP documented as provider-side |
| 9 | Spam protection on public forms | **Live, tested** | Rate limit, honeypot, timing, duplicates, validation; CAPTCHA **needs your Turnstile keys** |
| 10 | Thank-you page + separate failure state | **Live, tested** | Three exclusive states; success only with a real reference |
| 11 | GA4 events, no sensitive data, consent-respecting, optional | **Live; needs your measurement ID** | Nothing loads unconfigured or without consent |
| 12 | Privacy policy | **Live, tested** | No certification claims; deletion route documented |
| 13 | Searchable categorised FAQ + FAQPage JSON-LD | **Live, tested** | 22 answers, 8 categories; rich results are the search engine's call |
| 14 | Testimonials with admin CRUD, no fabrication | **Live, tested** | Owner-only; demo rows labelled Sample; **needs real quotes** |

Honest gaps: real testimonials, GA4 property, Turnstile keys, a real domain, Search Console
verification, edge TLS/clickjacking headers, and durable (non per-process) rate limiting.
