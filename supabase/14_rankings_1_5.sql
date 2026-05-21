-- Chute Plataforma 1.5 · Rankings reales desde Supabase
-- Ejecutar después de supabase/13_fixture_mode_1_4_3.sql.
-- Estas funciones entregan datos agregados. No exponen salas privadas ni detalle completo de torneos.

create or replace function public.get_chute_user_ranking(p_season text default 'all')
returns table (
  pos bigint,
  user_id uuid,
  name text,
  tournaments bigint,
  pj bigint,
  pg bigint,
  pe bigint,
  pp bigint,
  gf bigint,
  gc bigint,
  dg bigint,
  pts bigint,
  titles bigint,
  performance numeric,
  score bigint,
  status text
)
language sql
security definer
set search_path = public
as $$
  with played as (
    select m.*, t.season
    from public.matches m
    join public.tournaments t on t.id = m.tournament_id
    where m.home_goals is not null
      and m.away_goals is not null
      and coalesce(m.result_status, 'confirmed') = 'confirmed'
      and (p_season is null or p_season = 'all' or t.season = p_season)
  ), sides as (
    select home_user_id as user_id, home_goals::bigint as gf, away_goals::bigint as gc from played
    union all
    select away_user_id as user_id, away_goals::bigint as gf, home_goals::bigint as gc from played
  ), match_stats as (
    select
      user_id,
      count(*)::bigint as pj,
      sum(case when gf > gc then 1 else 0 end)::bigint as pg,
      sum(case when gf = gc then 1 else 0 end)::bigint as pe,
      sum(case when gf < gc then 1 else 0 end)::bigint as pp,
      sum(gf)::bigint as gf,
      sum(gc)::bigint as gc,
      sum(case when gf > gc then 3 when gf = gc then 1 else 0 end)::bigint as pts
    from sides
    where user_id is not null
    group by user_id
  ), tournament_counts as (
    select tp.user_id, count(distinct tp.tournament_id)::bigint as tournaments
    from public.tournament_players tp
    join public.tournaments t on t.id = tp.tournament_id
    where (p_season is null or p_season = 'all' or t.season = p_season)
    group by tp.user_id
  ), title_counts as (
    select champion_user_id as user_id, count(*)::bigint as titles
    from public.tournaments
    where champion_user_id is not null
      and status = 'closed'
      and (p_season is null or p_season = 'all' or season = p_season)
    group by champion_user_id
  ), rows as (
    select
      p.id as user_id,
      coalesce(p.alias, p.full_name, 'Jugador') as name,
      coalesce(tc.tournaments, 0)::bigint as tournaments,
      coalesce(ms.pj, 0)::bigint as pj,
      coalesce(ms.pg, 0)::bigint as pg,
      coalesce(ms.pe, 0)::bigint as pe,
      coalesce(ms.pp, 0)::bigint as pp,
      coalesce(ms.gf, 0)::bigint as gf,
      coalesce(ms.gc, 0)::bigint as gc,
      (coalesce(ms.gf, 0) - coalesce(ms.gc, 0))::bigint as dg,
      coalesce(ms.pts, 0)::bigint as pts,
      coalesce(tt.titles, 0)::bigint as titles,
      case when coalesce(ms.pj, 0) > 0 then round((coalesce(ms.pts, 0)::numeric / (ms.pj * 3)) * 100, 1) else 0 end as performance,
      (coalesce(ms.pts, 0) + coalesce(tt.titles, 0) * 20 + coalesce(ms.pg, 0) * 2)::bigint as score,
      case when coalesce(ms.pj, 0) >= 5 then 'Clasificado' else 'En clasificación' end as status
    from public.profiles p
    left join match_stats ms on ms.user_id = p.id
    left join tournament_counts tc on tc.user_id = p.id
    left join title_counts tt on tt.user_id = p.id
  )
  select
    row_number() over (order by score desc, performance desc, dg desc, name asc) as pos,
    user_id,
    name,
    tournaments,
    pj,
    pg,
    pe,
    pp,
    gf,
    gc,
    dg,
    pts,
    titles,
    performance,
    score,
    status
  from rows
  order by score desc, performance desc, dg desc, name asc;
$$;

create or replace function public.get_chute_team_ranking(p_season text default 'all')
returns table (
  pos bigint,
  team_id text,
  name text,
  tournaments bigint,
  pj bigint,
  pg bigint,
  pe bigint,
  pp bigint,
  gf bigint,
  gc bigint,
  dg bigint,
  pts bigint,
  titles bigint,
  performance numeric,
  score bigint
)
language sql
security definer
set search_path = public
as $$
  with played as (
    select m.*, t.season
    from public.matches m
    join public.tournaments t on t.id = m.tournament_id
    where m.home_goals is not null
      and m.away_goals is not null
      and coalesce(m.result_status, 'confirmed') = 'confirmed'
      and (p_season is null or p_season = 'all' or t.season = p_season)
  ), sides as (
    select home_team_id as team_id, home_goals::bigint as gf, away_goals::bigint as gc, tournament_id from played
    union all
    select away_team_id as team_id, away_goals::bigint as gf, home_goals::bigint as gc, tournament_id from played
  ), match_stats as (
    select
      team_id,
      count(*)::bigint as pj,
      sum(case when gf > gc then 1 else 0 end)::bigint as pg,
      sum(case when gf = gc then 1 else 0 end)::bigint as pe,
      sum(case when gf < gc then 1 else 0 end)::bigint as pp,
      sum(gf)::bigint as gf,
      sum(gc)::bigint as gc,
      sum(case when gf > gc then 3 when gf = gc then 1 else 0 end)::bigint as pts,
      count(distinct tournament_id)::bigint as tournaments
    from sides
    where team_id is not null
    group by team_id
  ), title_counts as (
    select champion_team_id as team_id, count(*)::bigint as titles
    from public.tournaments
    where champion_team_id is not null
      and status = 'closed'
      and (p_season is null or p_season = 'all' or season = p_season)
    group by champion_team_id
  ), rows as (
    select
      tm.id as team_id,
      coalesce(tm.short_name, tm.name, tm.id) as name,
      coalesce(ms.tournaments, 0)::bigint as tournaments,
      coalesce(ms.pj, 0)::bigint as pj,
      coalesce(ms.pg, 0)::bigint as pg,
      coalesce(ms.pe, 0)::bigint as pe,
      coalesce(ms.pp, 0)::bigint as pp,
      coalesce(ms.gf, 0)::bigint as gf,
      coalesce(ms.gc, 0)::bigint as gc,
      (coalesce(ms.gf, 0) - coalesce(ms.gc, 0))::bigint as dg,
      coalesce(ms.pts, 0)::bigint as pts,
      coalesce(tt.titles, 0)::bigint as titles,
      case when coalesce(ms.pj, 0) > 0 then round((coalesce(ms.pts, 0)::numeric / (ms.pj * 3)) * 100, 1) else 0 end as performance,
      (coalesce(ms.pts, 0) + coalesce(tt.titles, 0) * 20 + coalesce(ms.pg, 0) * 2)::bigint as score
    from public.teams tm
    left join match_stats ms on ms.team_id = tm.id
    left join title_counts tt on tt.team_id = tm.id
  )
  select
    row_number() over (order by score desc, performance desc, dg desc, name asc) as pos,
    *
  from rows
  order by score desc, performance desc, dg desc, name asc;
$$;

create or replace function public.get_chute_user_team_ranking(p_season text default 'all')
returns table (
  pos bigint,
  user_id uuid,
  team_id text,
  user_name text,
  team_name text,
  tournaments bigint,
  pj bigint,
  pg bigint,
  pe bigint,
  pp bigint,
  gf bigint,
  gc bigint,
  dg bigint,
  pts bigint,
  titles bigint,
  performance numeric,
  score bigint
)
language sql
security definer
set search_path = public
as $$
  with played as (
    select m.*, t.season
    from public.matches m
    join public.tournaments t on t.id = m.tournament_id
    where m.home_goals is not null
      and m.away_goals is not null
      and coalesce(m.result_status, 'confirmed') = 'confirmed'
      and (p_season is null or p_season = 'all' or t.season = p_season)
  ), sides as (
    select home_user_id as user_id, home_team_id as team_id, home_goals::bigint as gf, away_goals::bigint as gc, tournament_id from played
    union all
    select away_user_id as user_id, away_team_id as team_id, away_goals::bigint as gf, home_goals::bigint as gc, tournament_id from played
  ), match_stats as (
    select
      user_id,
      team_id,
      count(*)::bigint as pj,
      sum(case when gf > gc then 1 else 0 end)::bigint as pg,
      sum(case when gf = gc then 1 else 0 end)::bigint as pe,
      sum(case when gf < gc then 1 else 0 end)::bigint as pp,
      sum(gf)::bigint as gf,
      sum(gc)::bigint as gc,
      sum(case when gf > gc then 3 when gf = gc then 1 else 0 end)::bigint as pts,
      count(distinct tournament_id)::bigint as tournaments
    from sides
    where user_id is not null and team_id is not null
    group by user_id, team_id
  ), title_counts as (
    select champion_user_id as user_id, champion_team_id as team_id, count(*)::bigint as titles
    from public.tournaments
    where champion_user_id is not null
      and champion_team_id is not null
      and status = 'closed'
      and (p_season is null or p_season = 'all' or season = p_season)
    group by champion_user_id, champion_team_id
  ), rows as (
    select
      ms.user_id,
      ms.team_id,
      coalesce(p.alias, p.full_name, 'Jugador') as user_name,
      coalesce(tm.short_name, tm.name, ms.team_id) as team_name,
      coalesce(ms.tournaments, 0)::bigint as tournaments,
      coalesce(ms.pj, 0)::bigint as pj,
      coalesce(ms.pg, 0)::bigint as pg,
      coalesce(ms.pe, 0)::bigint as pe,
      coalesce(ms.pp, 0)::bigint as pp,
      coalesce(ms.gf, 0)::bigint as gf,
      coalesce(ms.gc, 0)::bigint as gc,
      (coalesce(ms.gf, 0) - coalesce(ms.gc, 0))::bigint as dg,
      coalesce(ms.pts, 0)::bigint as pts,
      coalesce(tt.titles, 0)::bigint as titles,
      case when coalesce(ms.pj, 0) > 0 then round((coalesce(ms.pts, 0)::numeric / (ms.pj * 3)) * 100, 1) else 0 end as performance,
      (coalesce(ms.pts, 0) + coalesce(tt.titles, 0) * 20 + coalesce(ms.pg, 0) * 2)::bigint as score
    from match_stats ms
    join public.profiles p on p.id = ms.user_id
    left join public.teams tm on tm.id = ms.team_id
    left join title_counts tt on tt.user_id = ms.user_id and tt.team_id = ms.team_id
  )
  select
    row_number() over (order by score desc, performance desc, dg desc, user_name asc, team_name asc) as pos,
    *
  from rows
  order by score desc, performance desc, dg desc, user_name asc, team_name asc;
$$;

create or replace function public.get_chute_player_ranking(p_season text default 'all')
returns table (
  pos bigint,
  player_name text,
  team_id text,
  team_name text,
  goals bigint,
  assists bigint,
  contributions bigint,
  tournaments bigint,
  last text
)
language sql
security definer
set search_path = public
as $$
  with valid_events as (
    select
      e.player_name,
      nullif(trim(e.assist_name), '') as assist_name,
      e.team_id,
      coalesce(tm.short_name, tm.name, e.team_id) as team_name,
      e.tournament_id,
      t.name as tournament_name,
      m.round,
      e.created_at
    from public.match_goal_events e
    join public.matches m on m.id = e.match_id
    join public.tournaments t on t.id = e.tournament_id
    left join public.teams tm on tm.id = e.team_id
    where m.home_goals is not null
      and m.away_goals is not null
      and coalesce(m.result_status, 'confirmed') = 'confirmed'
      and (p_season is null or p_season = 'all' or t.season = p_season)
  ), goals as (
    select
      player_name,
      team_id,
      max(team_name) as team_name,
      count(*)::bigint as goals,
      count(distinct tournament_id)::bigint as tournaments,
      (array_agg(tournament_name || ' · ' || round order by created_at desc))[1] as last
    from valid_events
    group by player_name, team_id
  ), assists as (
    select
      assist_name as player_name,
      team_id,
      max(team_name) as team_name,
      count(*)::bigint as assists,
      count(distinct tournament_id)::bigint as tournaments,
      (array_agg(tournament_name || ' · ' || round order by created_at desc))[1] as last
    from valid_events
    where assist_name is not null
    group by assist_name, team_id
  ), rows as (
    select
      coalesce(g.player_name, a.player_name) as player_name,
      coalesce(g.team_id, a.team_id) as team_id,
      coalesce(g.team_name, a.team_name) as team_name,
      coalesce(g.goals, 0)::bigint as goals,
      coalesce(a.assists, 0)::bigint as assists,
      (coalesce(g.goals, 0) + coalesce(a.assists, 0))::bigint as contributions,
      greatest(coalesce(g.tournaments, 0), coalesce(a.tournaments, 0))::bigint as tournaments,
      coalesce(g.last, a.last, 'Sin registro') as last
    from goals g
    full join assists a on a.player_name = g.player_name and a.team_id = g.team_id
  )
  select
    row_number() over (order by contributions desc, goals desc, assists desc, player_name asc) as pos,
    *
  from rows
  order by contributions desc, goals desc, assists desc, player_name asc;
$$;

grant execute on function public.get_chute_user_ranking(text) to authenticated;
grant execute on function public.get_chute_team_ranking(text) to authenticated;
grant execute on function public.get_chute_user_team_ranking(text) to authenticated;
grant execute on function public.get_chute_player_ranking(text) to authenticated;
