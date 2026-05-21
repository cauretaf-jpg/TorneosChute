-- Chute Plataforma 1.7.4 · Finalización segura de torneos
-- Ejecutar después de 19_fix_close_function_signature_1_7_3.sql.
-- Objetivo: cerrar torneos sin depender de funciones antiguas ni de cálculos complejos en SQL.
-- La app envía el campeón y un resumen calculado en el cliente; Supabase valida que el usuario sea creador.

create extension if not exists pgcrypto;

alter table public.tournaments
  add column if not exists champion_user_id uuid references public.profiles(id) on delete set null,
  add column if not exists champion_team_id text references public.teams(id) on delete set null,
  add column if not exists updated_at timestamptz default now();

create table if not exists public.tournament_summaries (
  tournament_id uuid primary key references public.tournaments(id) on delete cascade
);

alter table public.tournament_summaries
  add column if not exists champion_user_id uuid references public.profiles(id) on delete set null,
  add column if not exists champion_team_id text references public.teams(id) on delete set null,
  add column if not exists runner_up_user_id uuid references public.profiles(id) on delete set null,
  add column if not exists runner_up_team_id text references public.teams(id) on delete set null,
  add column if not exists best_attack_team_id text references public.teams(id) on delete set null,
  add column if not exists best_defense_team_id text references public.teams(id) on delete set null,
  add column if not exists top_scorer_name text,
  add column if not exists top_scorer_team_id text references public.teams(id) on delete set null,
  add column if not exists top_scorer_goals int not null default 0,
  add column if not exists top_assist_name text,
  add column if not exists top_assist_team_id text references public.teams(id) on delete set null,
  add column if not exists top_assist_count int not null default 0,
  add column if not exists best_player_name text,
  add column if not exists best_player_team_id text references public.teams(id) on delete set null,
  add column if not exists best_player_goals int not null default 0,
  add column if not exists best_player_assists int not null default 0,
  add column if not exists best_player_contributions int not null default 0,
  add column if not exists played_matches int not null default 0,
  add column if not exists total_goals int not null default 0,
  add column if not exists finished_at timestamptz not null default now(),
  add column if not exists summary_json jsonb not null default '{}'::jsonb,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

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

create policy tournament_summaries_select_related_v174
on public.tournament_summaries
for select
to authenticated
using (public.can_access_tournament(tournament_id));

create policy tournament_summaries_write_creator_v174
on public.tournament_summaries
for all
to authenticated
using (public.is_tournament_creator(tournament_id))
with check (public.is_tournament_creator(tournament_id));

grant select, insert, update, delete on public.tournament_summaries to authenticated;

create or replace function public.finish_chute_tournament_safe_v174(
  p_tournament_id uuid,
  p_champion_user_id uuid default null,
  p_champion_team_id text default null,
  p_summary_json jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_creator_id uuid;
  v_now timestamptz := now();
  v_played_matches int := 0;
  v_total_goals int := 0;
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
begin
  if v_user_id is null then
    raise exception 'Debes iniciar sesión para finalizar torneos.';
  end if;

  select creator_id into v_creator_id
  from public.tournaments
  where id = p_tournament_id;

  if not found then
    raise exception 'El torneo no existe.';
  end if;

  if v_creator_id is distinct from v_user_id then
    raise exception 'Solo el creador puede finalizar este torneo.';
  end if;

  select
    count(*)::int,
    coalesce(sum(coalesce(home_goals, 0) + coalesce(away_goals, 0)), 0)::int
  into v_played_matches, v_total_goals
  from public.matches
  where tournament_id = p_tournament_id
    and home_goals is not null
    and away_goals is not null
    and coalesce(result_status, 'confirmed') = 'confirmed';

  v_played_matches := greatest(v_played_matches, coalesce(nullif(p_summary_json ->> 'playedMatches', '')::int, 0));
  v_total_goals := greatest(v_total_goals, coalesce(nullif(p_summary_json ->> 'totalGoals', '')::int, 0));

  v_runner_up_user_id := nullif(p_summary_json ->> 'runnerUpUserId', '')::uuid;
  v_runner_up_team_id := nullif(p_summary_json ->> 'runnerUpTeamId', '');
  v_best_attack_team_id := nullif(p_summary_json ->> 'bestAttackTeamId', '');
  v_best_defense_team_id := nullif(p_summary_json ->> 'bestDefenseTeamId', '');
  v_top_scorer_name := nullif(p_summary_json ->> 'topScorerName', '');
  v_top_scorer_team_id := nullif(p_summary_json ->> 'topScorerTeamId', '');
  v_top_scorer_goals := coalesce(nullif(p_summary_json ->> 'topScorerGoals', '')::int, 0);
  v_top_assist_name := nullif(p_summary_json ->> 'topAssistName', '');
  v_top_assist_team_id := nullif(p_summary_json ->> 'topAssistTeamId', '');
  v_top_assist_count := coalesce(nullif(p_summary_json ->> 'topAssistCount', '')::int, 0);
  v_best_player_name := nullif(p_summary_json ->> 'bestPlayerName', '');
  v_best_player_team_id := nullif(p_summary_json ->> 'bestPlayerTeamId', '');
  v_best_player_goals := coalesce(nullif(p_summary_json ->> 'bestPlayerGoals', '')::int, 0);
  v_best_player_assists := coalesce(nullif(p_summary_json ->> 'bestPlayerAssists', '')::int, 0);
  v_best_player_contributions := coalesce(nullif(p_summary_json ->> 'bestPlayerContributions', '')::int, 0);

  update public.tournaments
  set
    status = 'closed',
    champion_user_id = p_champion_user_id,
    champion_team_id = p_champion_team_id,
    updated_at = v_now
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
    p_champion_user_id,
    p_champion_team_id,
    v_runner_up_user_id,
    v_runner_up_team_id,
    v_best_attack_team_id,
    v_best_defense_team_id,
    v_top_scorer_name,
    v_top_scorer_team_id,
    v_top_scorer_goals,
    v_top_assist_name,
    v_top_assist_team_id,
    v_top_assist_count,
    v_best_player_name,
    v_best_player_team_id,
    v_best_player_goals,
    v_best_player_assists,
    v_best_player_contributions,
    v_played_matches,
    v_total_goals,
    v_now,
    coalesce(p_summary_json, '{}'::jsonb),
    v_now
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
    updated_at = excluded.updated_at;

  begin
    insert into public.tournament_activity (tournament_id, type, message, user_id)
    values (p_tournament_id, 'closed', 'Se finalizó el torneo.', v_user_id);
  exception when others then
    null;
  end;

  return jsonb_build_object(
    'ok', true,
    'mode', 'finish_chute_tournament_safe_v174',
    'tournamentId', p_tournament_id,
    'championUserId', p_champion_user_id,
    'championTeamId', p_champion_team_id,
    'playedMatches', v_played_matches,
    'totalGoals', v_total_goals
  );
end;
$$;

grant execute on function public.finish_chute_tournament_safe_v174(uuid, uuid, text, jsonb) to authenticated;

notify pgrst, 'reload schema';
