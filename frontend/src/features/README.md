# src/features/ — 16 product domains

Each folder documents one domain: purpose, scope, implementation pointers, acceptance criteria and
open items. They contain **specifications, not duplicated code** — the engines live in `lib/core/**`
at the repository root until the phase-5 move.

| Folder | Domain | Primary feature ids (PRD) |
| --- | --- | --- |
| `data-ingestion` | Upload, parse, map | FR-1, FR-2 |
| `player-intelligence` | Profiles, risk, phases | FR-5, FR-11, FR-13 |
| `talent-discovery` | Age-banded scouting | FR-6 |
| `player-ranking` | Percentile engine + presets | FR-7 |
| `player-comparison` | Side-by-side analysis | FR-8 |
| `statistical-analysis` | Stats workbench | FR-9 |
| `squad-intelligence` | Balance, gaps, purse | FR-10 |
| `auction-strategy` | Valuation + auction room | FR-11 (sim), FR-21 |
| `match-intelligence` | Match-ups and phases | FR-16 |
| `predictive-analytics` | Monte Carlo + calibration | FR-20 |
| `venue-analysis` | Pitch/venue/weather | FR-17 |
| `opposition-scouting` | Pre-match plans | FR-19 |
| `career-trajectory` | Projections | FR-22 |
| `workload-management` | Load monitoring | FR-24 |
| `global-scouting` | Missions and verification | FR-12, FR-25 |
| `conversational-ai` | NL analytics + agents | FR-27, FR-28 |

Missing from this list by design: reports (shared output, see `components/reports/`), data quality
(cross-cutting, see `features/data-ingestion` + `lib/core/data/quality.ts`), security (cross-cutting,
see `../../security/`).
