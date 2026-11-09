# data/

Schemas, contracts and sample layouts for the data the platform consumes. **No real dataset lives in
this repository.** The demo workspace is generated deterministically from `lib/core/db/seed.ts` and is
labelled `DEMO` throughout the UI.

```
data/
├── schemas/       JSON Schema for the interchange formats (player, dataset record, feedback)
├── samples/       a two-row synthetic CSV showing the expected columns
└── README.md      this file
```

## Principles

1. **Provenance is mandatory.** Every record carries its source (`DEMO`, `UPLOADED`, `MODEL`).
2. **Raw input is preserved.** `dataset_records.raw` keeps the original cell values; mapping never
   destroys what the file actually said.
3. **Small samples are flagged, not hidden.** A 12-ball sample is allowed; quoting it without the
   denominator is not.
4. **No fabricated production data.** If a number is not measured, it is `null` and rendered as `—`.

## Column conventions

| Concept | Accepted headers (synonyms handled by `lib/core/data/synonyms.ts`) |
| --- | --- |
| Player name | `player`, `name`, `player_name`, `batsman` |
| Match date | `date`, `match_date`, `played_on` |
| Runs | `runs`, `runs_scored`, `batter_runs` |
| Balls | `balls`, `balls_faced`, `bf` |
| Wickets | `wickets`, `wkts` |
| Economy | `economy`, `econ`, `runs_per_over` |
| Team | `team`, `club`, `franchise`, `side` |

Anything unmatched is preserved in "unmapped columns" so a human can decide, rather than being dropped.
