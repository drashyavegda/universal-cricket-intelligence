# Scout guide

You have `scout` rights: read everything, run analyses, write shortlists and reports. You cannot
upload or approve data — send files to an analyst.

## 1. Run a discovery mission (`/scouting`)

1. Pick a **region** (state/country), a **role**, an **age ceiling** and an optional budget.
2. Run the mission. Each hit shows a **verification status**:
   * `verified` — record backed by an approved dataset,
   * `unverified` — appears in a note or partial source only,
   * `requires trial` — plausible but no performance evidence in the workspace.
3. Read the rationale line per hit. If it does not say why, do not put the player on a list.

## 2. Build a shortlist

1. Add players from `/players`, `/talent` or a mission result.
2. Open `/compare` with your candidates (2–8 at a time) and check the percentile table — percentiles
   are computed against the whole cohort, so a "90th percentile" means something.
3. Save the shortlist with a name and a note explaining the criteria. Analysts approve shortlists;
   the audit trail records who added what.

## 3. What good practice looks like

* Two sources per claim (a dataset and a match observation) whenever possible.
* Age and eligibility verified before the player goes on an auction shortlist.
* Workload checked for anyone who has played continuously — a tired fast bowler is a risk, not a
  bargain (`/workload`).
* Note the *absence* of evidence: "no death-over data" is a finding, not a gap to hide.

## 4. Reading a player card

| Panel | Meaning |
| --- | --- |
| Provenance chips | DEMO (synthetic) vs UPLOADED (approved data) vs MODEL (computed) |
| Confidence | how complete the record is — low confidence is not a verdict on the player |
| Risk band | consistency + availability composite; the components are listed |
| Phase splits | powerplay / middle / death with balls faced per phase |
| Trajectory | projections only when a season series exists |
| Workload flags | load indicators, explicitly not medical advice |

## 5. Escalation

| Situation | Route it to |
| --- | --- |
| Missing data on a promising player | analyst (upload/approve) |
| Conflicting figures for the same player | analyst (merge + conflict report) |
| Player looks good on video but not in data | note it in the shortlist; the platform will not invent a rating |
| Injury/fitness concerns | coaching staff — this platform does not assess medical readiness |
