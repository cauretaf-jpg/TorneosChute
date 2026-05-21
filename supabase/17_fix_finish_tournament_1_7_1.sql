-- Chute Plataforma 1.7.1 · Corrección de finalización de torneos
-- Ejecutar después de supabase/16_playoffs_1_7.sql.
-- Reinstala la función de cierre histórico y fuerza la recarga de esquema de PostgREST.

-- Ejecutar después de supabase/14_rankings_1_5.sql.
-- Guarda una ficha histórica persistente al finalizar cada torneo.

create extension if not exists pgcrypto;

create table if not exists public.tournament_summaries (
  tournament_id uuid primary key references public.tournaments(id) on delete cascade,
  champion_user_id uuid references public.profiles(id) on delete set null,
  champion_team_id text references public.teams(id) on delete set null,
  runner_up_user_id uuid references public.profiles(id) on delete set null,
  runner_up_team_id text references public.teams(id) on delete set null,
  best_attack_team_id text references public.teams(id) on delete set null,
  best_defense_team_id text references public.teams(id) on delete set null,
  top_scorer_name text,
  top_scorer_team_id text references public.teams(id) on delete set null,
  top_scorer_goals int not null default 0,
  top_assist_name text,
  top_assist_team_id text references public.teams(id) on delete set null,
  top_assist_count int not null default 0,
  best_player_name text,
  best_player_team_id text references public.teams(id) on delete set null,
  best_player_goals int not null default 0,
  best_player_assists int not null default 0,
  best_player_contributions int not null default 0,
  played_matches int not null default 0,
  total_goals int not null default 0,
  finished_at timestamptz not null default now(),
  summary_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.tournament_summaries enable row level security;

do $$
declare
  r record;
begin
  for r in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'tournament_summaries'
  loop
    execute format('drop policy if exists %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;

create policy tournament_summaries_select_related
on public.tournament_summaries
for select
to authenticated
using (public.can_access_tournament(tournament_id));

create policy tournament_summaries_insert_creator
on public.tournament_summaries
for insert
to authenticated
with check (public.is_tournament_creator(tournament_id));

create policy tournament_summaries_update_creator
on public.tournament_summaries
for update
to authenticated
using (public.is_tournament_creator(tournament_id))
with check (public.is_tournament_creator(tournament_id));

create policy tournament_summaries_delete_creator
on public.tournament_summaries
for delete
to authenticated
using (public.is_tournament_creator(tournament_id));

create index if not exists tournament_summaries_champion_user_idx on public.tournament_summaries(champion_user_id);
create index if not exists tournament_summaries_champion_team_idx on public.tournament_summaries(champion_team_id);
create index if not exists tournament_summaries_finished_at_idx on public.tournament_summaries(finished_at desc);

grant select, insert, update, delete on public.tournament_summaries to authenticated;

create or replace function public.close_chute_tournament(
  p_tournament_id uuid,
  p_champion_user_id uuid default null,
  p_champion_team_id text default null
)
returns public.tournament_summaries
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_tournament public.tournaments%rowtype;
  v_champion_user_id uuid;
  v_champion_team_id text;
  v_runner_up_user_id uuid;
  v_runner_up_team_id text;
  v_best_attack_team_id text;
  v_best_defense_team_id text;
  v_top_scorer_name text;
  v_top_scorer_team_id text;
  v_top_scorer_goals int := 0;
  v_top_assist_name text;
  v_top_assist_team_id text;
  v_top_assist_count int := 0;
  v_best_player_name text;
  v_best_player_team_id text;
  v_best_player_goals int := 0;
  v_best_player_assists int := 0;
  v_best_player_contributions int := 0;
  v_played_matches int := 0;
  v_total_goals int := 0;
  v_biggest_win text := 'Sin datos';
  v_highest_scoring text := 'Sin datos';
  v_summary public.tournament_summaries%rowtype;
begin
  if v_user_id is null then
    raise exception 'Debes iniciar sesión para finalizar torneos.';
  end if;

  select * into v_tournament
  from public.tournaments
  where id = p_tournament_id;

  if not found then
    raise exception 'El torneo no existe.';
  end if;

  if v_tournament.creator_id is distinct from v_user_id then
    raise exception 'Solo el creador puede finalizar este torneo.';
  end if;

  select count(*)::int, coalesce(sum(home_goals + away_goals), 0)::int
  into v_played_matches, v_total_goals
  from public.matches
  where tournament_id = p_tournament_id
    and home_goals is not null
    and away_goals is not null
    and coalesce(result_status, 'confirmed') = 'confirmed';

  if v_played_matches = 0 then
    raise exception 'No se puede finalizar un torneo sin partidos confirmados.';
  end if;

  if exists (
    select 1
    from public.matches
    where tournament_id = p_tournament_id
      and (
        home_goals is null
        or away_goals is null
        or coalesce(result_status, 'confirmed') <> 'confirmed'
      )
  ) then
    raise exception 'No se puede finalizar con partidos pendientes o sin confirmar.';
  end if;

  with played as (
    select *
    from public.matches
    where tournament_id = p_tournament_id
      and home_goals is not null
      and away_goals is not null
      and coalesce(result_status, 'confirmed') = 'confirmed'
  ), sides as (
    select home_user_id as user_id, home_goals::int as gf, away_goals::int as gc from played
    union all
    select away_user_id as user_id, away_goals::int as gf, home_goals::int as gc from played
  ), standings as (
    select
      user_id,
      count(*)::int as pj,
      sum(case when gf > gc then 1 else 0 end)::int as pg,
      sum(case when gf = gc then 1 else 0 end)::int as pe,
      sum(case when gf < gc then 1 else 0 end)::int as pp,
      sum(gf)::int as gf,
      sum(gc)::int as gc,
      (sum(gf) - sum(gc))::int as dg,
      sum(case when gf > gc then 3 when gf = gc then 1 else 0 end)::int as pts
    from sides
    where user_id is not null
    group by user_id
  ), ranked as (
    select *, row_number() over (order by pts desc, dg desc, gf desc, pg desc, user_id asc) as rn
    from standings
  )
  select
    max(user_id) filter (where rn = 1),
    max(user_id) filter (where rn = 2)
  into v_champion_user_id, v_runner_up_user_id
  from ranked;

  v_champion_user_id := coalesce(p_champion_user_id, v_champion_user_id);

  if p_champion_team_id is not null then
    v_champion_team_id := p_champion_team_id;
  elsif v_tournament.team_selection_mode = 'fixed' then
    select team_id into v_champion_team_id
    from public.tournament_players
    where tournament_id = p_tournament_id
      and user_id = v_champion_user_id
    limit 1;
  else
    v_champion_team_id := null;
  end if;

  if v_tournament.team_selection_mode = 'fixed' then
    select team_id into v_runner_up_team_id
    from public.tournament_players
    where tournament_id = p_tournament_id
      and user_id = v_runner_up_user_id
    limit 1;
  else
    v_runner_up_team_id := null;
  end if;

  with played as (
    select *
    from public.matches
    where tournament_id = p_tournament_id
      and home_goals is not null
      and away_goals is not null
      and coalesce(result_status, 'confirmed') = 'confirmed'
  ), team_sides as (
    select home_team_id as team_id, home_goals::int as gf, away_goals::int as gc from played
    union all
    select away_team_id as team_id, away_goals::int as gf, home_goals::int as gc from played
  ), team_stats as (
    select team_id, sum(gf)::int as gf, sum(gc)::int as gc, count(*)::int as pj
    from team_sides
    where team_id is not null
    group by team_id
  )
  select team_id into v_best_attack_team_id
  from team_stats
  order by gf desc, (gf - gc) desc, pj desc, team_id asc
  limit 1;

  with played as (
    select *
    from public.matches
    where tournament_id = p_tournament_id
      and home_goals is not null
      and away_goals is not null
      and coalesce(result_status, 'confirmed') = 'confirmed'
  ), team_sides as (
    select home_team_id as team_id, home_goals::int as gf, away_goals::int as gc from played
    union all
    select away_team_id as team_id, away_goals::int as gf, home_goals::int as gc from played
  ), team_stats as (
    select team_id, sum(gf)::int as gf, sum(gc)::int as gc, count(*)::int as pj
    from team_sides
    where team_id is not null
    group by team_id
  )
  select team_id into v_best_defense_team_id
  from team_stats
  order by gc asc, (gf - gc) desc, pj desc, team_id asc
  limit 1;

  select player_name, team_id, count(*)::int
  into v_top_scorer_name, v_top_scorer_team_id, v_top_scorer_goals
  from public.match_goal_events
  where tournament_id = p_tournament_id
  group by player_name, team_id
  order by count(*) desc, player_name asc
  limit 1;

  select assist_name, team_id, count(*)::int
  into v_top_assist_name, v_top_assist_team_id, v_top_assist_count
  from public.match_goal_events
  where tournament_id = p_tournament_id
    and nullif(trim(assist_name), '') is not null
  group by assist_name, team_id
  order by count(*) desc, assist_name asc
  limit 1;

  with goals as (
    select player_name, team_id, count(*)::int as goals
    from public.match_goal_events
    where tournament_id = p_tournament_id
    group by player_name, team_id
  ), assists as (
    select assist_name as player_name, team_id, count(*)::int as assists
    from public.match_goal_events
    where tournament_id = p_tournament_id
      and nullif(trim(assist_name), '') is not null
    group by assist_name, team_id
  ), players as (
    select
      coalesce(g.player_name, a.player_name) as player_name,
      coalesce(g.team_id, a.team_id) as team_id,
      coalesce(g.goals, 0) as goals,
      coalesce(a.assists, 0) as assists,
      coalesce(g.goals, 0) + coalesce(a.assists, 0) as contributions
    from goals g
    full join assists a on a.player_name = g.player_name and a.team_id = g.team_id
  )
  select player_name, team_id, goals, assists, contributions
  into v_best_player_name, v_best_player_team_id, v_best_player_goals, v_best_player_assists, v_best_player_contributions
  from players
  order by contributions desc, goals desc, assists desc, player_name asc
  limit 1;

  select concat(coalesce(ph.alias, 'Local'), ' ', m.home_goals, '-', m.away_goals, ' ', coalesce(pa.alias, 'Visita'))
  into v_biggest_win
  from public.matches m
  left join public.profiles ph on ph.id = m.home_user_id
  left join public.profiles pa on pa.id = m.away_user_id
  where m.tournament_id = p_tournament_id
    and m.home_goals is not null
    and m.away_goals is not null
    and coalesce(m.result_status, 'confirmed') = 'confirmed'
  order by abs(m.home_goals - m.away_goals) desc, (m.home_goals + m.away_goals) desc
  limit 1;

  select concat(m.home_goals, '-', m.away_goals, ' · ', coalesce(ph.alias, 'Local'), ' vs ', coalesce(pa.alias, 'Visita'))
  into v_highest_scoring
  from public.matches m
  left join public.profiles ph on ph.id = m.home_user_id
  left join public.profiles pa on pa.id = m.away_user_id
  where m.tournament_id = p_tournament_id
    and m.home_goals is not null
    and m.away_goals is not null
    and coalesce(m.result_status, 'confirmed') = 'confirmed'
  order by (m.home_goals + m.away_goals) desc, abs(m.home_goals - m.away_goals) desc
  limit 1;

  update public.tournaments
  set
    status = 'closed',
    champion_user_id = v_champion_user_id,
    champion_team_id = v_champion_team_id,
    updated_at = now()
  where id = p_tournament_id;

  insert into public.tournament_summaries (
    tournament_id,
    champion_user_id,
    champion_team_id,
    runner_up_user_id,
    runner_up_team_id,
    best_attack_team_id,
    best_defense_team_id,
    top_scorer_name,
    top_scorer_team_id,
    top_scorer_goals,
    top_assist_name,
    top_assist_team_id,
    top_assist_count,
    best_player_name,
    best_player_team_id,
    best_player_goals,
    best_player_assists,
    best_player_contributions,
    played_matches,
    total_goals,
    finished_at,
    summary_json,
    updated_at
  ) values (
    p_tournament_id,
    v_champion_user_id,
    v_champion_team_id,
    v_runner_up_user_id,
    v_runner_up_team_id,
    v_best_attack_team_id,
    v_best_defense_team_id,
    v_top_scorer_name,
    v_top_scorer_team_id,
    coalesce(v_top_scorer_goals, 0),
    v_top_assist_name,
    v_top_assist_team_id,
    coalesce(v_top_assist_count, 0),
    v_best_player_name,
    v_best_player_team_id,
    coalesce(v_best_player_goals, 0),
    coalesce(v_best_player_assists, 0),
    coalesce(v_best_player_contributions, 0),
    v_played_matches,
    v_total_goals,
    now(),
    jsonb_build_object(
      'biggestWin', coalesce(v_biggest_win, 'Sin datos'),
      'highestScoring', coalesce(v_highest_scoring, 'Sin datos')
    ),
    now()
  )
  on conflict (tournament_id) do update set
    champion_user_id = excluded.champion_user_id,
    champion_team_id = excluded.champion_team_id,
    runner_up_user_id = excluded.runner_up_user_id,
    runner_up_team_id = excluded.runner_up_team_id,
    best_attack_team_id = excluded.best_attack_team_id,
    best_defense_team_id = excluded.best_defense_team_id,
    top_scorer_name = excluded.top_scorer_name,
    top_scorer_team_id = excluded.top_scorer_team_id,
    top_scorer_goals = excluded.top_scorer_goals,
    top_assist_name = excluded.top_assist_name,
    top_assist_team_id = excluded.top_assist_team_id,
    top_assist_count = excluded.top_assist_count,
    best_player_name = excluded.best_player_name,
    best_player_team_id = excluded.best_player_team_id,
    best_player_goals = excluded.best_player_goals,
    best_player_assists = excluded.best_player_assists,
    best_player_contributions = excluded.best_player_contributions,
    played_matches = excluded.played_matches,
    total_goals = excluded.total_goals,
    finished_at = excluded.finished_at,
    summary_json = excluded.summary_json,
    updated_at = now()
  returning * into v_summary;

  insert into public.tournament_activity (tournament_id, type, message, user_id)
  values (p_tournament_id, 'closed', 'Se finalizó el torneo y se guardó el historial competitivo.', v_user_id);

  return v_summary;
end;
$$;

grant execute on function public.close_chute_tournament(uuid, uuid, text) to authenticated;


-- Forzar recarga del esquema REST de Supabase/PostgREST.
notify pgrst, 'reload schema';
