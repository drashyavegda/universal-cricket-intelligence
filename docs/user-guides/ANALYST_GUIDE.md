# Analyst guide

You have `analyst` rights: upload, edit, run analyses, write shortlists, generate reports. You
cannot approve data or change settings — ask an owner for those.

## 1. Bring data in (`/data`)

1. **Upload & ingest** — drag CSV/XLSX/JSON/PDF/TXT files (25 MB each, 50k rows per dataset by
   default). Multiple files in one upload are parsed together.
2. **Check the mapping preview.** The platform proposes a platform field for each source column.
   Anything it cannot map is kept verbatim in "unmapped columns" — nothing is silently dropped.
3. **Read the validation summary.** Errors block promotion; warnings are reviewable. Typical
   warnings: missing DOB, impossible date, duplicate player name + state.
4. **Preview & correct.** Open a record, fix a value, save. The record gets a new version and an
   audit entry.
5. **Ask an owner to approve.** Only approved rows feed analytics. This is deliberate: a bad row
   should never reach a board report by accident.

> Small-sample warning: a player with 12 balls faced will appear, but every rate metric shows its
> denominator. Do not build a case on one innings — the ranking engine's confidence column is the
> tool for that.

## 2. Build the analysis

| Task | Route | What to set | What to check |
| --- | --- | --- | --- |
| Rank talent | `/talent` | max age, uncapped only, role filters, weight preset | sensitivity report — does the top 10 survive a weight change? |
| Compare players | `/compare` | 2–8 players | like-for-like warning for mixed roles |
| Deep-dive one player | `/players/[id]` | — | risk band, workload flags, trajectory note |
| Squad gaps | `/team` | your team | P1 gaps and purse position |
| Auction planning | `/auction` | purse, seed | bid ceilings and their caveats |
| Match forecast | `/prediction` | two teams, simulations, seed | forecast-quality score, not just the win % |
| Conditions | `/pitch` | venue, optional weather | evidence tag + matches behind each claim |

## 3. Package it (`/reports`)

1. Choose the builder (`talent` for the shortlist brief, `player`, `team`, `venue`).
2. Set options (max age, size, narration on/off) and generate.
3. Read the **quality score** and **open issues** — if the score is below 80, the report says why.
4. Export: PDF (staff), DOCX (editable), XLSX (analysts), PPTX (board), MD/HTML (archive).

## 4. Rules of the house

* Never quote a metric without its sample size in a deck.
* Label anything the model narrated; the app already marks mode (`DEMO NARRATION` without a key).
* Re-run with the same seed before defending a scenario — reproducibility is the point.
* If a number looks impossible, check the dataset quality tab before blaming the engine.

## 5. When something goes wrong

| Symptom | Do this |
| --- | --- |
| "Sign in required" | session expired (12 h) — sign in again; your work is not lost |
| Analysis returns fewer players than expected | filters are strict; widen age or include capped players |
| Report export is empty | confirm you have `report:write` and the report still exists |
| "Insufficient history" | that player has no season series — the platform refuses to invent a curve |
