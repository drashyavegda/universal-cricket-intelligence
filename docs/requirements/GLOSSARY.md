# Glossary

## Cricket
| Term | Meaning in this platform |
| --- | --- |
| Strike rate (SR) | runs per 100 balls faced — always shown with balls faced |
| Economy (econ) | runs conceded per over — shown with overs bowled |
| Average | runs per dismissal; `null` when dismissals = 0 (not infinite, not 0) |
| Phase | powerplay (1–6), middle (7–15), death (16–20) |
| DOB / age | age is computed at `REFERENCE_DATE`; `null` when DOB is unknown |
| Capped / uncapped | capped = has played international cricket in the dataset |
| Overseas | player is not eligible for the domestic national side |
| Retained | player already in the user team's squad before the auction |
| Purse | auction budget in lakh (₹1 lakh = 100,000) |
| Wicketkeeper-batter | role requiring at least one selection in a legal XI |
| Death-over specialist | bowler with ≥ 25% of overs in overs 16–20 and economy above cohort median |

## Platform
| Term | Meaning |
| --- | --- |
| DEMO | synthetic seeded record; never a real person |
| UPLOADED | record derived from a user upload that has been approved |
| MODEL | value produced by an engine (valuation, projection, simulation) |
| Provenance | the source(s) a record came from, with fetch/approval time |
| Confidence | 0–1 estimate of how trustworthy a record/score is, driven by completeness and sample size |
| Coverage | share of requested metrics a player actually has data for |
| Percentile | position within the comparison cohort (whole cohort, not the filtered subset unless stated) |
| Headroom | youth upside adjustment applied to young players in talent discovery |
| Sensitivity report | rank movement when metric weights change — the honesty check |
| Quality gate | minimum standard a report must meet before it is exportable |
| Trust score | workspace-level composite of dataset quality, coverage and source reliability |
| Posture score | security self-assessment; never 100 and always lists gaps |
| Seed | integer that makes a stochastic simulation reproducible |
| Reference date | the "today" used for ages and workload windows (demo: 2027-04-01) |
| Store façade | `lib/core/db/store.ts` — the only persistence boundary |
| Guard | `guard(permission)` — the server-side permission check on API routes |
| Intent | the parsed meaning of an assistant question (`rank_players`, `write_action`, …) |
| Evidence block | the facts an AI answer is allowed to use; carries source ids |
| Confirm-required | flag on write intents: nothing executes until the user confirms |
