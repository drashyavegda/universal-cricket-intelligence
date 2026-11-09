# analytics/queries/

Versioned SQL used by internal dashboards and ad-hoc analysis on the Postgres path.

| File | Answers |
| --- | --- |
| `player_form.sql` | a player's recent innings with rolling form and a low-sample flag |
| `squad_gap.sql` *(planned)* | phase coverage per team vs the league median |
| `data_quality_trend.sql` *(planned)* | dataset quality score over time, by uploader |

Conventions: named parameters (`:player_id`), no `select *` in anything that ships, explicit `null`
handling for undefined rates, and a `sample_flag` whenever a small sample could mislead. Every query
that informs a product number must also exist in TypeScript under `lib/core/**`, because the app must
work without a database.
