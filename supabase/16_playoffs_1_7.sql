-- Chute Plataforma 1.7 · Playoffs y definiciones
-- Ejecutar después de supabase/15_tournament_history_1_6.sql.
-- Agrega llaves de eliminación directa, tercer lugar y definición por penales solo en playoffs.

create extension if not exists pgcrypto;

alter table public.tournaments
  add column if not exists third_place_enabled boolean not null default false;

alter table public.matches
  add column if not exists stage text,
  add column if not exists bracket_round int,
  add column if not exists bracket_slot int,
  add column if not exists next_match_id uuid references public.matches(id) on delete set null,
  add column if not exists next_side text,
  add column if not exists loser_next_match_id uuid references public.matches(id) on delete set null,
  add column if not exists loser_next_side text,
  add column if not exists winner_user_id uuid references public.profiles(id) on delete set null,
  add column if not exists penalty_winner_user_id uuid references public.profiles(id) on delete set null,
  add column if not exists proposed_penalty_winner_user_id uuid references public.profiles(id) on delete set null;

alter table public.matches
  drop constraint if exists matches_next_side_check,
  drop constraint if exists matches_loser_next_side_check;

alter table public.matches
  add constraint matches_next_side_check check (next_side is null or next_side in ('home','away')),
  add constraint matches_loser_next_side_check check (loser_next_side is null or loser_next_side in ('home','away'));

create index if not exists matches_bracket_idx on public.matches(tournament_id, bracket_round, bracket_slot);
create index if not exists matches_next_match_idx on public.matches(next_match_id);
create index if not exists matches_loser_next_match_idx on public.matches(loser_next_match_id);
create index if not exists tournaments_third_place_idx on public.tournaments(third_place_enabled);

-- Reemplaza la función de creación para guardar la opción de tercer lugar.
drop function if exists public.create_chute_tournament(text, text, text, text, boolean, text, text, text, text, text, uuid[]);
drop function if exists public.create_chute_tournament(text, text, text, text, boolean, text, text, boolean, text, text, text, uuid[]);

create function public.create_chute_tournament(
  p_name text,
  p_description text default null,
  p_format text default 'league',
  p_visibility text default 'private',
  p_allow_duplicate_teams boolean default false,
  p_team_selection_mode text default 'fixed',
  p_fixture_mode text default 'single_leg',
  p_third_place_enabled boolean default false,
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

  if p_format = 'knockout' then
    p_fixture_mode := 'single_leg';
  else
    p_third_place_enabled := false;
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
    third_place_enabled,
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
    coalesce(p_third_place_enabled, false),
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
    case
      when p_format = 'knockout' and p_third_place_enabled then 'Se creó una eliminación directa con partido por tercer lugar.'
      when p_format = 'knockout' then 'Se creó una eliminación directa.'
      when p_fixture_mode = 'double_leg' then 'Se creó el torneo con fixture de ida y vuelta.'
      else 'Se creó el torneo con fixture de solo ida.'
    end,
    v_user_id
  );

  return v_tournament_id;
end;
$$;

grant execute on function public.create_chute_tournament(text, text, text, text, boolean, text, text, boolean, text, text, text, uuid[]) to authenticated;

grant select, insert, update, delete on public.tournaments to authenticated;
grant select, insert, update, delete on public.matches to authenticated;
