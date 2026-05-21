-- Chute Plataforma 1.4.3 · Fixture solo ida / ida y vuelta
-- Ejecutar después de 12_fix_tournament_create_1_4_2.sql.

create extension if not exists pgcrypto;

alter table public.tournaments
  add column if not exists fixture_mode text not null default 'single_leg';

alter table public.tournaments
  drop constraint if exists tournaments_fixture_mode_check;

alter table public.tournaments
  add constraint tournaments_fixture_mode_check
  check (fixture_mode in ('single_leg', 'double_leg'));

create index if not exists tournaments_fixture_mode_idx on public.tournaments(fixture_mode);

-- Reemplaza la función anterior para que la creación de torneos guarde el modo de fixture.
drop function if exists public.create_chute_tournament(text, text, text, text, boolean, text, text, text, text, uuid[]);
drop function if exists public.create_chute_tournament(text, text, text, text, boolean, text, text, text, text, text, uuid[]);

create function public.create_chute_tournament(
  p_name text,
  p_description text default null,
  p_format text default 'league',
  p_visibility text default 'private',
  p_allow_duplicate_teams boolean default false,
  p_team_selection_mode text default 'fixed',
  p_fixture_mode text default 'single_leg',
  p_invite_code text default null,
  p_season text default 'Temporada 2026',
  p_creator_team_id text default null,
  p_invite_user_ids uuid[] default '{}'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_tournament_id uuid;
  v_invited_user_id uuid;
  v_code text := nullif(trim(coalesce(p_invite_code, '')), '');
begin
  if v_user_id is null then
    raise exception 'Debes iniciar sesión para crear torneos.';
  end if;

  if nullif(trim(coalesce(p_name, '')), '') is null then
    raise exception 'El torneo necesita nombre.';
  end if;

  if p_format not in ('league', 'league_playoff', 'groups', 'knockout') then
    raise exception 'Formato de torneo no válido.';
  end if;

  if p_visibility not in ('private', 'public') then
    raise exception 'Visibilidad no válida.';
  end if;

  if p_team_selection_mode not in ('fixed', 'free_per_match') then
    raise exception 'Modo de equipos no válido.';
  end if;

  if p_fixture_mode not in ('single_leg', 'double_leg') then
    raise exception 'Modo de fixture no válido.';
  end if;

  if p_team_selection_mode = 'fixed' and nullif(trim(coalesce(p_creator_team_id, '')), '') is null then
    raise exception 'Debes elegir un equipo para el torneo.';
  end if;

  if p_team_selection_mode = 'free_per_match' then
    p_creator_team_id := null;
    p_allow_duplicate_teams := true;
  end if;

  if v_code is null then
    v_code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
  end if;

  insert into public.tournaments (
    name,
    description,
    format,
    visibility,
    status,
    allow_duplicate_teams,
    team_selection_mode,
    fixture_mode,
    invite_code,
    season,
    creator_id
  ) values (
    trim(p_name),
    nullif(trim(coalesce(p_description, '')), ''),
    p_format,
    p_visibility,
    'preparing',
    coalesce(p_allow_duplicate_teams, false),
    p_team_selection_mode,
    p_fixture_mode,
    v_code,
    coalesce(nullif(trim(coalesce(p_season, '')), ''), 'Temporada 2026'),
    v_user_id
  )
  returning id into v_tournament_id;

  insert into public.tournament_players (tournament_id, user_id, team_id, joined_by_code)
  values (v_tournament_id, v_user_id, p_creator_team_id, false)
  on conflict (tournament_id, user_id)
  do update set team_id = excluded.team_id;

  if p_invite_user_ids is not null then
    foreach v_invited_user_id in array p_invite_user_ids loop
      if v_invited_user_id is not null and v_invited_user_id <> v_user_id then
        insert into public.tournament_invitations (tournament_id, from_user_id, to_user_id, status, responded_at)
        values (v_tournament_id, v_user_id, v_invited_user_id, 'pending', null)
        on conflict (tournament_id, to_user_id)
        do update set
          from_user_id = excluded.from_user_id,
          status = 'pending',
          responded_at = null,
          created_at = now();
      end if;
    end loop;
  end if;

  insert into public.tournament_activity (tournament_id, type, message, user_id)
  values (
    v_tournament_id,
    'created',
    case when p_fixture_mode = 'double_leg'
      then 'Se creó el torneo con fixture de ida y vuelta.'
      else 'Se creó el torneo con fixture de solo ida.'
    end,
    v_user_id
  );

  return v_tournament_id;
end;
$$;

grant execute on function public.create_chute_tournament(text, text, text, text, boolean, text, text, text, text, text, uuid[]) to authenticated;

grant select, insert, update, delete on public.tournaments to authenticated;
grant select, insert, update, delete on public.tournament_players to authenticated;
grant select, insert, update, delete on public.tournament_invitations to authenticated;
grant select, insert, update, delete on public.tournament_join_requests to authenticated;
grant select, insert, update, delete on public.matches to authenticated;
grant select, insert, delete on public.match_goal_events to authenticated;
grant select, insert, delete on public.tournament_activity to authenticated;
grant select on public.profiles to authenticated;
grant select on public.teams to authenticated;
grant select on public.team_players to authenticated;
