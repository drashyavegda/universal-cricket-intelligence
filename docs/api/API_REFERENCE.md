# API reference

Base URL: `NEXT_PUBLIC_SITE_URL` (local: `http://localhost:3000`). All endpoints are JSON over
HTTPS. Authentication is a cookie session (`ucip_session`, HttpOnly) — no bearer tokens are
issued in phase 1.

**Permission column:** `view` (any signed-in user), `analysis:run`, `data:upload`, `data:approve`,
`shortlist:write`, `report:write`, `settings:ai`, `settings:security`, `public` (no session).
Unauthenticated calls to guarded routes return `401 {code:"AUTH_REQUIRED"}`; insufficient role
returns `403 {code:"FORBIDDEN"}`.

---

## System
| Method | Path | Permission | Purpose |
| --- | --- | --- | --- |
| GET | `/api/health` | public | Liveness: `{status:"ok", mode, referenceDate, uptime}` |
| GET | `/api/service/status` | `view` | FastAPI connection status: `{configured, endpoint, source, timeoutMs, tokenConfigured, latencyMs, health, ready, version, summary, serving}`. Always `200` — an unreachable dependency is data, not an error. |
| POST | `/api/service/describe` | `view` | Round-trip probe → FastAPI `/stats/describe` on a labelled synthetic sample. Returns `{source:"fastapi"\|"local-fallback", result, latencyMs, backend}` so the response always says which engine answered. |

## Auth
| Method | Path | Permission | Body / notes |
| --- | --- | --- | --- |
| POST | `/api/auth/login` | public | `{email, password, totp?}` → sets cookie; 429 on rate limit, 423 on lockout |
| DELETE | `/api/auth/login` | session | Logout, clears cookie |
| GET | `/api/auth/me` | public | `{user|null, role, demoAccounts, permissions}` |
| POST | `/api/auth/2fa` | session | `{action:"enable"|"disable"|"verify", code?}` |

## Data pipeline
| Method | Path | Permission | Notes |
| --- | --- | --- | --- |
| POST | `/api/upload` | `data:upload` | multipart `files[]`, `instructions`, `name` → dataset + quality summary |
| GET | `/api/datasets` | `view` | list with status, row counts, quality |
| PATCH | `/api/datasets/[id]` | `data:approve` | `{action:"approve"|"reject"}` |
| GET | `/api/datasets/[id]` | `view` | paginated records: `page, q, severity, pageSize` |
| GET | `/api/datasets/[id]/quality` | `view` | completeness/consistency detail + issues |
| PATCH | `/api/records/[id]` | `data:edit` | corrected `mapped` fields → new version |
| POST | `/api/merge` | `data:upload` | `{datasetIds[], key, tolerance}` → merged dataset + conflicts |
| POST | `/api/export` | `report:write` | `{datasetIds[], format}` → CSV/XLSX download |

## Player intelligence
| Method | Path | Permission | Notes |
| --- | --- | --- | --- |
| GET | `/api/players` | `view` | `q, page, pageSize, role, ageMin, ageMax, uncapped, team` |
| GET | `/api/players/[id]` | `view` | profile: metrics, risk, phase, workload, trajectory, valuation |
| POST | `/api/rank` | `analysis:run` | `{weights, filters, limit}` → percentile scores + sensitivity |
| POST | `/api/talent` | `analysis:run` | `{maxAge, size, roles?, uncapped?, weights?}` |
| POST | `/api/compare` | `analysis:run` | `{ids: string[2..8]}` → metric table, radar series, context warnings |
| POST | `/api/stats` | `analysis:run` | `{values[] | metric, method, window}` → statistics + method notes |

## Team, auction, match
| Method | Path | Permission | Notes |
| --- | --- | --- | --- |
| GET | `/api/teams` | `view` | teams + user team flag |
| GET | `/api/team/[id]` | `view` | squad balance, weaknesses, priority gaps, purse |
| POST | `/api/xi` | `analysis:run` | `{teamId, seed?, constraints?}` → XI + bowling plan + checks |
| GET | `/api/auction` | `view` | valuations, scarcity, market context |
| POST | `/api/auction` | `analysis:run` | `{purseLakh, seed, participants?}` → simulated auction |
| GET | `/api/venues` | `view` | venue list with metadata |
| POST | `/api/pitch` | `analysis:run` | `{venueId, weather?}` → venue DNA + toss strategy |
| POST | `/api/opposition` | `analysis:run` | `{opponentTeamId}` → threats, plan, match-ups |
| POST | `/api/predict` | `analysis:run` | `{teamAId, teamBId, simulations, seed}` → probabilities + bands + quality |
| GET | `/api/workload` | `view` | reference date, per-player load, flags |
| POST | `/api/scouting` | `analysis:run` | `{region, role, ageMax, budgetLakh}` → mission results with verification |

## Knowledge, AI, automation
| Method | Path | Permission | Notes |
| --- | --- | --- | --- |
| GET | `/api/knowledge` | `view` | `q, limit` → ranked chunks with citations |
| POST | `/api/assistant` | `analysis:run` | `{query, confirm?}` → intent, answer, evidence, `confirmRequired` |
| GET | `/api/workflows` | `view` | workflow definitions + recent runs |
| POST | `/api/workflows` | `shortlist:write` | `{workflowId, inputs, approve?}` → run record |
| GET | `/api/workflows/[id]` | `view` | single run with step log |

## Reports & shortlists
| Method | Path | Permission | Notes |
| --- | --- | --- | --- |
| GET | `/api/reports` | `view` | saved reports + builders + subject lists |
| POST | `/api/reports` | `report:write` | `{type, playerId?, teamId?, venueId?, maxAge?, size?, narrate?}` |
| GET | `/api/reports/[id]` | `view` | full report |
| GET | `/api/reports/[id]/export` | `report:write` | `?format=md|html|pdf|docx|xlsx|pptx` → file bytes |
| GET | `/api/shortlists` | `view` | shortlists |
| POST | `/api/shortlists` | `shortlist:write` | `{name, playerIds[]}` |
| PATCH/DELETE | `/api/shortlists/[id]` | `shortlist:approve` / `shortlist:write` | approve, edit, delete |

## Settings, audit, notifications
| Method | Path | Permission | Notes |
| --- | --- | --- | --- |
| GET | `/api/settings` | `view` | non-secret settings (AI key shown as `hasApiKey`) |
| PATCH | `/api/settings` | `settings:ai` | reference date, limits, AI provider/model (write-only key) |
| GET/PATCH | `/api/settings/security` | `settings:security` | 2FA policy, session length, posture |
| GET | `/api/audit` | `view` | `limit` → audit entries |
| GET/PATCH | `/api/notifications` | `view` | list; `{all:true}` marks read |

## Public / growth
| Method | Path | Permission | Notes |
| --- | --- | --- | --- |
| POST | `/api/public/feedback` | public | contact form; 201 + `reference`, 422/400/409/429 rejects |
| GET | `/api/testimonials` | public | published only (`?scope=all` = owner) |
| POST/PATCH/DELETE | `/api/testimonials` | `settings:security` | owner-only CRUD; `{purgeSamples:true}` |
| GET/PATCH | `/api/feedback` | `report:write` | workspace inbox; `{id, status}` |

## Response shapes

```jsonc
// success (read)
{ "players": [ /* … */ ], "pagination": { "page": 1, "pages": 3, "total": 61 } }

// success (write)
{ "ok": true, "report": { "id": "rep_…" } }

// typed failure
{ "error": "Sign in required for this action.", "code": "AUTH_REQUIRED" }
{ "error": "Your role (scout) lacks the "data:approve" permission.", "code": "FORBIDDEN" }
{ "ok": false, "reason": "validation", "errors": { "email": "Enter a valid email address…" }, "checks": ["rate_limit:pass"] }
```

## Non-existent endpoints (common mistakes)

| Called | Reality |
| --- | --- |
| `POST /api/auction/simulate` | use `POST /api/auction` |
| `GET /api/player/:id` | use `GET /api/players/[id]` (plural) |
| `POST /api/auth/logout` | use `DELETE /api/auth/login` |
| `POST /api/contact` | use `POST /api/public/feedback` |
| `GET /api/reports/export?…` | use `GET /api/reports/[id]/export?format=…` |
