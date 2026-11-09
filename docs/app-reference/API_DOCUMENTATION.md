# API documentation

Base URL: `http://localhost:3000` · All routes are `dynamic` (no caching) and return JSON unless
they are file exports.

## Authentication

Cookie-based sessions. Log in once and the browser carries `ucip_session` (httpOnly, 12 h).

| Method | Path | Body | Notes |
| --- | --- | --- | --- |
| POST | `/api/auth/login` | `{ email, password, totp? }` | Sets the session cookie. 5 failed attempts ⇒ 10-minute lock. |
| DELETE | `/api/auth/login` | — | Log out (invalidates the session). |
| GET | `/api/auth/me` | — | Current user + permissions, or `401`. |
| GET | `/api/auth/2fa` | — | 2FA status and enrolment secret for the current user. |
| POST | `/api/auth/2fa` | `{ code }` | Verify a TOTP code and enable 2FA. |

## Error contract

| Status | Body | When |
| --- | --- | --- |
| 400 | `{ "error": "human readable reason" }` | Bad payload, impossible parameter combination |
| 401 | `{ "error": "...", "code": "AUTH_REQUIRED" }` | No/expired session |
| 403 | `{ "error": "...", "code": "FORBIDDEN" }` | Session valid, role lacks the permission |
| 404 | `{ "error": "..." }` | Unknown id |
| 422 | `{ "error": "..." }` | Data cannot support the requested analysis (e.g. 3 paired points for regression) |
| 429 | `{ "error": "...", "retryAfter": 42 }` | Rate limit exceeded |
| 500 | `{ "error": "Internal error", "detail": "..." }` | Unexpected failure (detail is never a secret) |

## Roles and permissions

| Permission | owner | analyst | scout | viewer |
| --- | :-: | :-: | :-: | :-: |
| `view` | ✅ | ✅ | ✅ | ✅ |
| `data:upload` / `data:edit` | ✅ | ✅ | — | — |
| `data:approve` (dataset-level) | ✅ | — | — | — |
| `analysis:run` | ✅ | ✅ | ✅ | — |
| `shortlist:write` / `shortlist:approve` | ✅ | ✅ | ✅ / — | — |
| `report:write` | ✅ | ✅ | ✅ | — |
| `settings:ai` / `settings:security` / `admin:users` | ✅ | — | — | — |

Note the deliberate four-eyes split: an analyst may edit and approve **records**, but only an
owner can approve a **dataset** (which is what promotes records into the analytical store).

## Read endpoints

| Method | Path | Query | Returns |
| --- | --- | --- | --- |
| GET | `/api/health` | — | Public. Mode, counts, AI status, optional analytics-service reachability. |
| GET | `/api/overview` | — | Dashboard KPIs, recent fixtures, alerts, data-quality summary. |
| GET | `/api/players` | `q, role, sort, page, pageSize, maxAge, capped, overseas` | Paginated player table with computed rates. |
| GET | `/api/players/[id]` | `tab?` | Full intelligence card: metrics, percentiles, risk, valuation, forecasts, workload, similar players. |
| GET | `/api/rank` | — | Strategy presets, metric catalogue and defaults for the ranking UI. |
| GET | `/api/teams` | — | Franchises, purse, squad size. |
| GET | `/api/team/[id]` | — | Squad intelligence, phase coverage, purse, replacement lab inputs. |
| GET | `/api/xi` | — | Flavours and constraint defaults. |
| GET | `/api/auction` | `teamId?` | Valuation inputs, market overview, scarcity, rival purses. |
| GET | `/api/predict` | — | Teams, venues, match-ups, methodology notes. |
| GET | `/api/venues` | — | Venue list with aggregate profiles. |
| GET | `/api/workload` | — | Workload board for all players + policy statement. |
| GET | `/api/knowledge` | `q?` | Document library, or ranked chunk results when `q` is present. |
| GET | `/api/shortlists` | — | Saved shortlists and presets. |
| GET | `/api/shortlists/[id]` | — | One shortlist with its items. |
| GET | `/api/reports` | — | Archive, builder catalogue, pickable players/teams/venues. |
| GET | `/api/reports/[id]` | — | One full report (sections, quality, sources). |
| GET | `/api/reports/[id]/export` | `format=md\|html\|pdf\|docx\|xlsx\|pptx` | File download. |
| GET | `/api/datasets` | — | Datasets, sources, limits. |
| GET | `/api/datasets/[id]` | `page?` | Dataset + paginated extracted records + status counts. |
| GET | `/api/datasets/[id]/quality` | — | Quality scoring breakdown. |
| GET | `/api/workflows` | — | Agent registry, workflow templates, recent runs, governance note. |
| GET | `/api/workflows/[id]` | — | One run with per-step status. |
| GET | `/api/settings` | — | Settings, AI status, budget, usage, users, sessions, env checklist. |
| GET | `/api/settings/security` | — | Control coverage, posture score, gaps (self-assessment). |
| GET | `/api/audit` | `limit` | Audit trail (append-only, capped). |
| GET | `/api/notifications` | — | Notifications + unread count. |
| GET | `/api/export` | `type=players\|matches\|valuations&format=csv\|xlsx` | Row-level tabular export. |

## Write endpoints

| Method | Path | Body | Permission |
| --- | --- | --- | --- |
| POST | `/api/upload` | `multipart/form-data`: `files[]`, `name`, `competition`, `season`, `instructions` | `data:upload` |
| PATCH | `/api/records/[id]` | `{ action: 'approve'\|'reject'\|'reset', fields?, mapped? }` | `data:edit` |
| PATCH | `/api/datasets` | `{ datasetId, status: 'approved'\|'needs_review', notes? }` | `data:approve` — approving promotes approved rows |
| POST | `/api/merge` | `{ datasetIds: string[] }` | `data:approve` |
| POST | `/api/rank` | `{ weights, roles?, maxAge?, ageWeight?, limit? }` | `analysis:run` |
| POST | `/api/talent` | `{ maxAge, minAge?, preset?, size?, ageHeadroomWeight? }` | `analysis:run` |
| POST | `/api/compare` | `{ ids: string[2..8], teamId?, replacement? }` | `analysis:run` |
| POST | `/api/stats` | `{ op, metric, groupBy?, window?, bins? }` | `analysis:run` |
| POST | `/api/xi` | `{ flavour, venueId?, constraints?, seed? }` | `analysis:run` |
| POST | `/api/auction` | `{ teamId?, playerId?, aggression?, seed?, simulations? }` | `analysis:run` |
| POST | `/api/predict` | `{ teamAId, teamBId, venueId?, simulations?, seed?, tossWinnerId?, tossDecision? }` | `analysis:run` |
| POST | `/api/pitch` | `{ venueId?, adjustment? }` | `analysis:run` |
| POST | `/api/opposition` | `{ opponentId?, venueId? }` | `analysis:run` |
| POST | `/api/scouting` | `{ region, role?, ageMin?, ageMax?, limit? }` | `analysis:run` |
| POST | `/api/workload` | `{ playerId, extraMatches?, extraOvers?, availability? }` | `analysis:run` |
| POST | `/api/shortlists` | `{ name, presetKey, filters, playerIds }` | `shortlist:write` |
| PATCH | `/api/shortlists/[id]` | `{ action: 'approve'\|'reject', note? }` | `shortlist:approve` |
| POST | `/api/reports` | `{ type, playerId?, teamId?, venueId?, maxAge?, size?, language?, narrate? }` | `report:write` |
| POST | `/api/knowledge` | `{ title, kind, tags[], body }` | `analysis:run` |
| POST | `/api/assistant` | `{ query, language? }` | `analysis:run` |
| POST | `/api/workflows` | `{ workflowId, maxAge?, presetKey?, goal? }` | `analysis:run` |
| POST | `/api/workflows/[id]` | `{ approve: true }` | `shortlist:approve` (approval gate) |
| PATCH | `/api/settings` | `{ referenceDate?, language?, ai?, limits?, security? }` | `settings:ai` / `settings:security` |
| POST | `/api/settings/security` | `{ controlId }` | `view` — threat simulation only, no state change |
| PATCH | `/api/notifications` | `{ id }` or `{ all: true }` | `view` |

## Examples

```bash
# log in and keep the cookie
curl -c cookie.txt -X POST http://localhost:3000/api/auth/login \
  -H 'content-type: application/json' \
  -d '{"email":"analyst@demo.local","password":"Analyst#12345"}'

# rank young batters under 23
curl -b cookie.txt -X POST http://localhost:3000/api/rank \
  -H 'content-type: application/json' \
  -d '{"weights":{"batting.strikeRate":3,"batting.average":2,"form.formIndex":1},"maxAge":23,"limit":10}'

# run 5,000 seeded simulations
curl -b cookie.txt -X POST http://localhost:3000/api/predict \
  -H 'content-type: application/json' \
  -d '{"teamAId":"tm_01","teamBId":"tm_02","simulations":5000,"seed":2027}'

# export a report as Word
curl -b cookie.txt -o report.docx \
  "http://localhost:3000/api/reports/rep_talent_xxxx/export?format=docx"
```

## Determinism guarantees

- `POST /api/predict` and `POST /api/auction` accept `seed`; the same seed and inputs produce
  byte-identical numbers.
- `POST /api/rank`, `/api/talent`, `/api/xi` are deterministic without a seed (the XI optimiser has
  a default seed and is deterministic for a fixed seed).
- `POST /api/assistant` is deterministic **in demo mode**; with a live model the narration text
  varies but the underlying evidence block does not.

## Public / growth endpoints (no session required)

These three routes exist so that visitors who are not signed in can ask questions and read
published content. Abuse is handled inside the handler (rate limit, honeypot, timing,
CAPTCHA, validation, duplicate suppression), never by authentication.

### `POST /api/public/feedback`
Body: `{ name, email, organisation?, kind, message, pageUrl?, consent, honeypot, elapsedMs, captchaToken? }`
in JSON. `kind` ∈ `question | feedback | bug | data-issue | deletion-request`.

| Outcome | Status | Body |
| --- | --- | --- |
| stored | `201` | `{ ok: true, reference: "FB-8H3K2Q", checks: [...] }` |
| field errors | `422` | `{ ok: false, reason: "validation", errors: { name: "…" }, checks: [...] }` |
| honeypot or instant submit | `400` | `{ ok: false, reason: "spam", checks: [...] }` |
| CAPTCHA failed (only when configured) | `400` | `{ ok: false, reason: "captcha", … }` |
| identical message within 15 minutes | `409` | `{ ok: false, reason: "duplicate", … }` |
| more than 5 messages / 10 minutes / IP | `429` + `Retry-After` | `{ ok: false, reason: "rate_limited", retryAfterSeconds }` |

The `checks` array is the audit trace (`rate_limit:pass`, `honeypot:pass`,
`timing:pass`, `captcha:skipped(captcha-not-configured)`, `validation:pass`,
`duplicate:pass`) and is safe to log.

### `GET /api/testimonials`
Public. Returns `{ testimonials: Testimonial[], stats }` containing **published rows only**.
Sample/demo rows are included with `sample: true`.
`GET /api/testimonials?scope=all` requires the owner role (`settings:security`) and returns
drafts and hidden rows too.

### `POST | PATCH | DELETE /api/testimonials` — owner only
`POST` body: `{ name, role, organisation, quote, imageUrl?, rating?, status? }`;
`POST { "purgeSamples": true }` deletes all seeded sample rows.
`PATCH` body: `{ id, ...fields }`. `DELETE /api/testimonials?id=tst_…`.
Responses: `201`/`200` with the record and refreshed `stats`; `422` with `errors` on invalid
input; `401` anonymous; `403` for analyst/scout/viewer (verified).

### `GET /api/feedback` — analyst and above (`report:write`)
`{ feedback: FeedbackSubmission[], stats: { total, open } }`. Each row carries `reference`,
`kind`, sanitised message, `status`, `ipHint` (a hash — never the raw address) and the
`spamChecks` trace.
`PATCH /api/feedback` body `{ id, status: "new" | "acknowledged" | "closed" }`.

### Crawling endpoints
`GET /sitemap.xml` (6 public URLs), `GET /robots.txt`, `GET /opengraph-image` (1200×630 PNG),
`GET /players/{id}/opengraph-image-…` (1200×630 PNG, reachable without a session so link
previews work).
