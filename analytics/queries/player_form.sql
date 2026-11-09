-- Player form: last N innings with rolling strike rate and a minimum-ball filter.
--
-- Written for the Postgres path. In the JSON store the equivalent is
-- lib/core/players/metrics.ts#formSeries. Both must agree; the parity test lives in
-- database/schemas/views.sql's comments and in docs/testing/TEST_STRATEGY.md §4.
--
-- Parameters: :player_id, :innings (int), :min_balls (int)

with innings as (
  select
    m.id                as match_id,
    m.played_on,
    e.innings,
    count(*)            as balls,
    sum(e.runs_batter)  as runs,
    count(*) filter (where e.is_wicket) as dismissals
  from match_events e
  join matches m on m.id = e.match_id
  where e.batter_id = :player_id
  group by m.id, m.played_on, e.innings
),
recent as (
  select * from innings order by played_on desc, innings desc limit :innings
)
select
  match_id,
  played_on,
  balls,
  runs,
  dismissals,
  -- Rates are NULL when the denominator is zero: never report 0.00 as "no strike rate".
  case when balls = 0 then null else round(runs::numeric * 100 / balls, 2) end as strike_rate,
  case
    when balls < :min_balls then 'low_sample'
    else 'ok'
  end as sample_flag,
  round(avg(runs) over (order by played_on rows between 4 preceding and current row), 2)
    as rolling_runs_5,
  count(*) over () as innings_in_window
from recent
order by played_on desc;
