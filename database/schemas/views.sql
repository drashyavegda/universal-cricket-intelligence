-- Convenience views for analytical queries (Postgres path only).
-- The JSON adapter does not use these; nothing in the application depends on them.

-- Bowling aggregate with explicit workload denominators.
create or replace view player_bowling_aggregate as
select
  e.bowler_id                                   as player_id,
  m.season,
  m.competition,
  count(*)                                      as balls_bowled,
  sum(e.runs_batter + e.runs_extras)             as runs_conceded,
  count(*) filter (where e.is_wicket)            as wickets,
  round(count(*) / 6.0, 1)                       as overs,
  round(sum(e.runs_batter + e.runs_extras)::numeric
        * 6 / nullif(count(*), 0), 2)            as economy,
  round(count(*)::numeric / nullif(count(*) filter (where e.is_wicket), 0), 2) as strike_rate
from match_events e
join matches m on m.id = e.match_id
where e.bowler_id is not null
group by e.bowler_id, m.season, m.competition;

-- Phase splits: the platform's core analytical cut.
create or replace view phase_profile as
select
  e.batter_id as player_id,
  m.season,
  e.phase,
  count(*)                    as balls,
  sum(e.runs_batter)          as runs,
  count(*) filter (where e.is_wicket) as dismissals,
  round(sum(e.runs_batter)::numeric * 100 / nullif(count(*), 0), 2) as strike_rate
from match_events e
join matches m on m.id = e.match_id
where e.batter_id is not null and e.phase is not null
group by e.batter_id, m.season, e.phase;
