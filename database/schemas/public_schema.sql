-- Reference schema for a fresh UCIP database.
-- Keep in lockstep with database/migrations/0001_init.sql (same objects, same order).
-- Generated/maintained by hand: this project has no ORM that could derive it.

-- psql -f database/schemas/public_schema.sql  ⇒  an empty, fully indexed database

create extension if not exists "pgcrypto";
create extension if not exists "citext";

-- Tables (columns, checks, foreign keys, indexes) are defined in 0001_init.sql.
-- This file repeats them verbatim so a new environment can be created in one command:
\i ../migrations/0001_init.sql

-- Read-only helpers -------------------------------------------------------------
-- Per-player season aggregate. Sample size columns are NOT optional: every consumer
-- must be able to show "how many balls is this based on?".
create or replace view player_season_aggregate as
select
  e.batter_id                                                as player_id,
  m.season,
  m.competition,
  count(*)                                                   as balls_faced,
  sum(e.runs_batter)                                         as runs,
  count(*) filter (where e.is_wicket)                        as dismissals,
  round(
    case when count(*) filter (where e.is_wicket) = 0 then null
         else sum(e.runs_batter)::numeric
              / count(*) filter (where e.is_wicket) end, 2)    as average,
  round(sum(e.runs_batter)::numeric * 100 / nullif(count(*), 0), 2) as strike_rate
from match_events e
join matches m on m.id = e.match_id
where e.batter_id is not null
group by e.batter_id, m.season, m.competition;

comment on view player_season_aggregate is
  'Batting aggregate with explicit ball counts. average/strike_rate are NULL when undefined — never 0.';
