# Schema reference

Two persistence shapes share one domain model (`lib/core/types.ts`):

1. **JSON document store** — `$DATA_DIR/store.json`, one object with array collections
   (`StoreShape`). Default for phase 1 and local development.
2. **PostgreSQL** — `db/migrations/0001_init.sql` (tables, FKs, RLS policies, audit
   immutability). Phase 3 target; the store façade abstracts the swap.

---

## 1. Collections / tables

### Identity & governance
| Entity | Key fields | Notes |
| --- | --- | --- |
| `User` | `id`, `email` (unique), `name`, `role`, `passwordHash`, `salt`, `twoFactorEnabled`, `twoFactorSecret`, `organisationId`, `lastLoginAt`, `failedLogins`, `lockedUntil` | roles: `owner | analyst | scout | viewer` |
| `Session` | `id`, `userId`, `tokenHash`, `createdAt`, `expiresAt`, `ip`, `userAgent` | 12 h default; server-side invalidation |
| `AuditEntry` | `id`, `at`, `actor`, `action`, `entity`, `entityId`, `detail`, `ip` | append-only, capped at 2,000 |
| `AiUsageEntry` | `id`, `at`, `provider`, `model`, `purpose`, `promptTokens`, `completionTokens`, `usd`, `status` | status `ok|error|demo|blocked` |
| `PlatformSettings` | `referenceDate`, `demoMode`, `ai{}`, `limits{}`, `security{}`, `language` | secrets never stored in plain text; `hasApiKey` boolean only |

### Cricket domain
| Entity | Key fields | Relationships |
| --- | --- | --- |
| `Player` | `id`, `name`, `dob`, `age`, `team`, `state`, `competition`, `season`, `format`, `role`, `battingStyle`, `bowlingType`, `capped`, `overseas`, `wicketkeeper`, `batting{}`, `bowling{}`, `fielding{}`, `phaseBatting{}`, `phaseBowling{}`, `matchLog[]`, `career[]`, `confidence`, `synthetic`, `sources[]` | `matchLog[].matchId → Match.id`; `sources[] → SourceRecord` |
| `Team` | `id`, `name`, `shortName`, `isUserTeam`, `colours`, `purseLakh`, `squadIds[]` | exactly one `isUserTeam: true` (Rajasthan Royals in the demo) |
| `Match` | `id`, `date`, `venueId`, `homeTeamId`, `awayTeamId`, `result{}`, `events[]` | `events[].playerId → Player.id`; match-ups must read `events`, never slice positionally |
| `Venue` | `id`, `name`, `city`, `country`, `pitchType`, `boundarySize`, `altitude` | `WeatherObservation.venueId → Venue.id` |
| `WeatherObservation` | `id`, `venueId`, `observedAt`, `temperatureC`, `humidity`, `windKph`, `conditions` | optional; venue engine degrades without it |
| `SourceRecord` | `id`, `name`, `kind`, `reliability`, `fetchedAt` | drives data-quality scoring |

### Data pipeline
| Entity | Key fields | Relationships |
| --- | --- | --- |
| `Dataset` | `id`, `name`, `category`, `format`, `competition`, `season`, `kind` (`demo|uploaded`), `status` (`needs_review|approved`), `rowCount`, `recordCount`, `qualityScore`, `files[]`, `mappingSummary[]` | `records[].datasetId → Dataset.id` |
| `DatasetRecord` | `id`, `datasetId`, `playerName`, `fields{}` (raw), `mapped{}`, `confidence`, `issues[]`, `status`, `sourceRow`, `unknownFields{}`, `version` | unique `(datasetId, sourceRow)` |
| `SavedReport` | `id`, `type`, `title`, `sections[]`, `sources[]`, `quality{}`, `createdBy`, `createdAt`, `seed` | `sections[].evidence[]` |

### Engagement & growth
| Entity | Key fields | Notes |
| --- | --- | --- |
| `Testimonial` | `id`, `name`, `role`, `organisation`, `quote`, `imageUrl`, `rating`, `status` (`draft|published|hidden`), `sample`, `source`, `createdBy`, `createdAt`, `updatedAt` | owner-only writes |
| `FeedbackSubmission` | `id`, `reference` (`FB-XXXXXX`), `kind`, `name`, `email`, `organisation`, `message`, `pageUrl`, `consent`, `status` (`new|acknowledged|closed`), `createdAt`, `ipHint`, `userAgentHint`, `spamChecks[]` | raw IP never stored |
| `Notification` | `id`, `at`, `level`, `title`, `body`, `read`, `href` | capped at 200 |
| `Shortlist` | `id`, `name`, `playerIds[]`, `createdBy`, `status`, `notes` | approval gated |
| `KnowledgeDoc` | `id`, `title`, `body`, `tags[]`, `chunks[]`, `createdAt` | BM25 index built on demand |
| `WorkflowRun` | `id`, `workflowId`, `status`, `steps[]`, `approvals[]`, `startedAt`, `finishedAt` | approval required before writes |

## 2. Relationships (cardinality)

```
Team 1─* Player (by team name in phase 1; squad ids on Team)
Venue 1─* Match        Venue 1─* WeatherObservation
Match 1─* MatchPerf (embedded in Player.matchLog)   Match 1─* ball events
Dataset 1─* DatasetRecord     DatasetRecord *─1 Player (after promotion)
SavedReport *─1 User (createdBy)     Shortlist *─* Player
User 1─* Session      User 1─* AuditEntry (actor is email in phase 1)
```

## 3. Constraints and indexes (PostgreSQL)

* `users(email)` unique; `sessions(token_hash)` unique; `sessions(expires_at)` indexed for
  cleanup.
* `datasets(status)`, `dataset_records(dataset_id, status)`, `dataset_records(dataset_id, source_row)`
  unique.
* `players(name, team, season)` index for lookups; `players(role, age)` for talent queries.
* `audit_log(at desc)` index; append-only enforced by trigger/rule; `UPDATE`/`DELETE` denied to
  the application role.
* Row-level security policies scope queries by `organisation_id` where multi-tenancy is enabled.
* `feedback(reference)` unique; `testimonials(status)` indexed.

## 4. Migration policy

* Files are numbered and immutable once applied: `0001_init.sql`, `0002_….sql`.
* Every migration must be idempotent-safe where possible (`IF NOT EXISTS`) and paired with a
  rollback note in its header comment.
* JSON → Postgres parity is verified by the same engine tests running against both adapters
  (phase 3 work item).

## 5. Retention

See [DATA_RETENTION.md](DATA_RETENTION.md). Summary: audit 2,000 entries, notifications 200,
feedback 5,000, sessions expire in 12 h, datasets kept until deleted, reports kept with the
dataset they reference.
