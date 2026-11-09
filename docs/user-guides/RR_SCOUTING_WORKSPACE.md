# Rajasthan Royals — IPL 2027 scouting workspace

The demo workspace is configured as an RR scouting environment. This guide describes what is
pre-set, what you change, and the end-to-end brief workflow.

## 1. Pre-configured

| Setting | Value | Where |
| --- | --- | --- |
| User team | Rajasthan Royals (`RR`), colours `#E8C15C`, `isUserTeam: true` | `lib/core/db/seed.ts` (team list) |
| Reference date | `2027-04-01` | `REFERENCE_DATE` / `PlatformSettings.referenceDate` |
| Talent preset | uncapped, age ≤ 23, 10-player shortlist, "IPL 2027 uncapped domestic brief" | `lib/core/ranking/presets.ts` + `/talent` |
| Auction rules | purse in lakh, overseas cap, role scarcity weights | `/auction`, `/xi`, `lib/core/auction/valuation.ts` |
| Report builder | `talent` produces the 10-player brief with policy caveats | `/reports` |

> All players, stats and prices in demo mode are **synthetic** and labelled `DEMO`. Real IPL or
> domestic data must be uploaded and approved; the platform ships no official league data.

## 2. The brief workflow (target: ≤ 60 minutes)

| Step | Route | Action | Output |
| --- | --- | --- | --- |
| 1 | `/data` | Upload the season's batting/bowling sheets + age sheet (PDF trials optional) | dataset with quality score |
| 2 | `/data` | Fix flagged rows; owner approves | approved records, promoted players |
| 3 | `/talent` | max age 23, uncapped only, weights "RR 2027" | ranked candidate pool + sensitivity |
| 4 | `/compare` | top 8–10 side by side | like-for-like warnings, percentile context |
| 5 | `/players/[id]` | check risk, workload, trajectory | flags and caveats per candidate |
| 6 | `/team` | confirm P1 gaps (role, phase) | gap list that justifies each pick |
| 7 | `/auction` | model bid ceilings for the shortlist | ceilings + purse scenarios |
| 8 | `/reports` | generate the `talent` brief | 10-player brief, quality gate |
| 9 | `/reports` | export | PDF (coaches), XLSX (analysts), PPTX (board) |

## 3. Decision discipline for this workspace

* **Uncapped eligibility is a hard filter**, not a tiebreaker. If the data cannot prove
  eligibility, the player is listed as `requires trial` rather than included.
* **Every pick needs a role justification** from `/team` (which gap it closes).
* **Bid ceilings are ranges.** Quote the range and the assumption that produced it (scarcity, need,
  age curve). Re-run the same seed before quoting a number in the room.
* **Sample size honesty:** domestic seasons vary in length; the brief must show balls faced and
  matches per candidate.

## 4. Worked example (demo data)

1. `/talent` with `{maxAge: 23, size: 10}` returns the demo candidate pool with scores and
   confidence.
2. `/compare` on three of them shows a radar overlay; two are all-rounders and the page warns the
   comparison is not like-for-like against a specialist batter.
3. `/players/[id]` shows one candidate with an "insufficient history" trajectory note — no curve is
   drawn, and the brief repeats that caveat.
4. `/reports` → generate (`talent`) → quality 80/100 with one open issue; export PDF/DOCX/XLSX/PPTX.

## 5. What this workspace does *not* do

* No live IPL feed, no official auction values, no player contracts.
* No medical or fitness assessment.
* No guarantee of performance — outputs are decision support with visible uncertainty.

## 6. Handing over

Export the brief plus the XLSX and store both against the cycle date. The saved report keeps its
sources and quality score, so a later reviewer can see exactly what the decision was based on.
