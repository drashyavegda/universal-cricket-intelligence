# Sample data (synthetic)

**Every player, team and number in this folder is fictional.** It exists to exercise the
ingestion pipeline: inconsistent headers, mixed date formats, missing values, duplicates
and out-of-range values. Do not present any of it as real cricket data.

| File | What it exercises |
| --- | --- |
| `domestic_batting_2026_27.csv` | Messy header synonyms (`Player Name`, `Bat Style`, `Balls Faced`), `dd/mm/yyyy` dates, a blank name, a duplicate row, a blank DOB, an impossible runs value |
| `domestic_bowling_2026_27.csv` | Bowler-only sheet, overs vs balls, partial overlap of names with the batting sheet (merge demo) |
| `age_group_trials.csv` | Very small samples, `yrs` instead of `age`, free-text notes column that must be preserved as unknown fields |
| `auction_2026.json` | JSON array with `sold_price_lakh` / `base_price_lakh`, used by the auction valuation demo |
| `scouting_note.md` | Plain-text/PDF path — free-form scouting prose, chunked into the research library |

## How to load them

1. Sign in as `analyst@demo.local` / `Analyst#12345`.
2. **Data Room → Upload** and select one or more files (CSV, XLSX, JSON, PDF, TXT/MD accepted).
3. Review the mapping table and the quality report; approve rows you trust.
4. Approve the dataset — approved rows are **promoted** into the analytical store
   (`lib/core/data/promote.ts`) and immediately become rankable, valuable and simulatable.

Reset the demo store at any time by deleting `.data/store.json` (or `POST /api/health` is
read-only; use the Data Room's "reset to demo seed" control or restart with `SEED_RESET=1`).
