-- Chute Plataforma 1.0 - vistas agregadas para rankings globales
-- Estas vistas muestran estadísticas acumuladas, no el detalle completo de torneos privados.

create or replace view public_user_match_stats as
select
  p.id as user_id,
  p.alias,
  count(*)::int as pj,
  sum(case when side.goals_for > side.goals_against then 1 else 0 end)::int as pg,
  sum(case when side.goals_for = side.goals_against then 1 else 0 end)::int as pe,
  sum(case when side.goals_for < side.goals_against then 1 else 0 end)::int as pp,
  sum(side.goals_for)::int as gf,
  sum(side.goals_against)::int as gc,
  (sum(side.goals_for) - sum(side.goals_against))::int as dg,
  sum(case when side.goals_for > side.goals_against then 3 when side.goals_for = side.goals_against then 1 else 0 end)::int as pts
from profiles p
join (
  select home_user_id as user_id, home_goals as goals_for, away_goals as goals_against from matches where result_status = 'confirmed'
  union all
  select away_user_id as user_id, away_goals as goals_for, home_goals as goals_against from matches where result_status = 'confirmed'
) side on side.user_id = p.id
group by p.id, p.alias;

create or replace view public_user_ranking as
select
  ums.*,
  coalesce(champ.titles, 0)::int as titles,
  round(case when ums.pj > 0 then (ums.pts::numeric / (ums.pj * 3)) * 100 else 0 end, 1) as performance,
  (ums.pts + coalesce(champ.titles, 0) * 20 + ums.pg * 2)::int as score,
  case when ums.pj >= 5 then 'Clasificado' else 'En clasificación' end as status
from public_user_match_stats ums
left join (
  select champion_user_id as user_id, count(*) as titles
  from tournaments
  where status = 'closed' and champion_user_id is not null
  group by champion_user_id
) champ on champ.user_id = ums.user_id;

create or replace view public_team_ranking as
select
  t.id as team_id,
  coalesce(t.short_name, t.name) as team_name,
  count(*)::int as pj,
  sum(case when side.goals_for > side.goals_against then 1 else 0 end)::int as pg,
  sum(case when side.goals_for = side.goals_against then 1 else 0 end)::int as pe,
  sum(case when side.goals_for < side.goals_against then 1 else 0 end)::int as pp,
  sum(side.goals_for)::int as gf,
  sum(side.goals_against)::int as gc,
  (sum(side.goals_for) - sum(side.goals_against))::int as dg,
  sum(case when side.goals_for > side.goals_against then 3 when side.goals_for = side.goals_against then 1 else 0 end)::int as pts,
  round(case when count(*) > 0 then (sum(case when side.goals_for > side.goals_against then 3 when side.goals_for = side.goals_against then 1 else 0 end)::numeric / (count(*) * 3)) * 100 else 0 end, 1) as performance
from teams t
join (
  select home_team_id as team_id, home_goals as goals_for, away_goals as goals_against from matches where result_status = 'confirmed'
  union all
  select away_team_id as team_id, away_goals as goals_for, home_goals as goals_against from matches where result_status = 'confirmed'
) side on side.team_id = t.id
group by t.id, t.short_name, t.name;

create or replace view public_player_scorer_ranking as
select
  mge.player_name,
  coalesce(t.short_name, t.name) as team_name,
  count(*)::int as goals,
  count(mge.assist_name)::int as assists
from match_goal_events mge
join teams t on t.id = mge.team_id
group by mge.player_name, t.short_name, t.name
order by goals desc, assists desc, player_name asc;
