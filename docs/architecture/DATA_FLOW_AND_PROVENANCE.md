# Data flow and provenance

## 1. Pipeline

```
file(s) ──► ingest ──► parse ──► map ──► validate ──► preview/correct ──► approve ──► promote
                                                                                        │
                                                             Player records ◄────────────┘
                                                                    │
              metrics · ranking · valuation · simulation · forecasting · reports
                                                                    │
                                                            export (PDF/DOCX/XLSX/PPTX/MD/HTML)
```

| Stage | Module | Persisted | Gate |
| --- | --- | --- | --- |
| ingest | `app/api/upload` | file metadata on `Dataset` | size/row caps |
| parse | `lib/core/data/parse.ts` | `DatasetRecord.fields` (raw) | type/format sniff |
| map | `lib/core/data/synonyms.ts` | `DatasetRecord.mapped` + `mappingSummary` | unmapped preserved |
| validate | `lib/core/data/parse.ts` | `issues[]`, `status` | blocking errors ⇒ `needs_review` |
| correct | `PATCH /api/records/[id]` | new `version`, audit | field-level rules |
| approve | `POST /api/datasets/[id]` (PATCH action) | `status: approved`, audit | `data:approve` permission |
| promote | `lib/core/data/promote.ts` | `Player` records | approved rows only |
| analyse | `lib/core/**` | computed on request (not stored, except reports) | none |
| export | `lib/core/reporting/export.ts` | `SavedReport` + file bytes | `report:write` |

## 2. Provenance rules

1. Every `Player` carries `synthetic` and `sources[]` (`sourceName`, `kind`, `fetchedAt`).
2. Demo promotion replaces the DEMO placeholder rather than duplicating a name.
3. A metric derived from fewer than the configured minimum sample is marked low-confidence and
   the UI shows the sample size next to it.
4. Nothing is imputed: missing ⇒ `null` + a note. Rankings reduce `coverage` instead of filling.
5. Reports include a source list and a quality score; the export header repeats them.

## 3. Approval and audit

`DatasetRecord.status`: `needs_review → approved` (or `rejected`). Approval requires
`data:approve` (owner) and writes `audit {action: 'dataset_approved'}`. Any later edit bumps
`version` and re-flags the record for review.

## 4. Retention and deletion

| Data | Retention | Control |
| --- | --- | --- |
| Uploaded dataset + records | until deleted by owner | `DELETE` on dataset (owner) |
| Feedback messages | capped at 5,000 newest | privacy policy §4 |
| Audit entries | capped at 2,000 newest | store trim |
| AI usage | capped, per call | `AiUsageEntry` |
| Sessions | 12 h default (`SESSION_MINUTES`) | server-side expiry |
| Exports | user-downloaded; not stored server-side beyond the saved report | — |

## 5. Data classification

| Class | Examples | Handling |
| --- | --- | --- |
| Public | FAQ, tour, privacy, marketing copy | indexable |
| Internal | demo dataset, aggregate metrics | workspace only, noindex |
| Confidential | uploaded competition data, reports, shortlists | session + RBAC, noindex, never in OG cards |
| Secret | API keys, session tokens, 2FA secrets, DB URLs | server env only, write-only UI, encrypted at rest where configured |

## 6. Referential integrity (JSON store today)

Enforced in the store façade and checked in tests: `DatasetRecord.datasetId → Dataset.id`,
`Match.events[].playerId → Player.id`, `SavedReport.createdBy → User.email`,
`Session.userId → User.id`, `FeedbackSubmission.id → audit entityId`. Postgres adds real FKs in
`db/migrations/0001_init.sql`.
