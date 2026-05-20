-- Chute Plataforma 1.4.2 · RLS endurecido y creación segura de torneos
-- Ejecutar después de supabase/11_fix_rls_recursion_1_4_1.sql.
-- Corrige: new row violates row-level security policy for table "tournaments".

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- Funciones auxiliares sin recursión para políticas RLS.
-- -----------------------------------------------------------------------------
create or replace function public.is_tournament_creator(p_tournament_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.tournaments t
    where t.id = p_tournament_id
      and t.creator_id = auth.uid()
  );
$$;

create or replace function public.is_tournament_participant(p_tournament_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.tournament_players tp
    where tp.tournament_id = p_tournament_id
      and tp.user_id = auth.uid()
  );
$$;

create or replace function public.has_tournament_invitation(p_tournament_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.tournament_invitations ti
    where ti.tournament_id = p_tournament_id
      and auth.uid() in (ti.from_user_id, ti.to_user_id)
  );
$$;

create or replace function public.has_tournament_join_request(p_tournament_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.tournament_join_requests tjr
    where tjr.tournament_id = p_tournament_id
      and tjr.user_id = auth.uid()
  );
$$;

create or replace function public.can_access_tournament(p_tournament_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_tournament_creator(p_tournament_id)
    or public.is_tournament_participant(p_tournament_id)
    or public.has_tournament_invitation(p_tournament_id)
    or public.has_tournament_join_request(p_tournament_id);
$$;

create or replace function public.is_match_player(p_match_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.matches m
    where m.id = p_match_id
      and auth.uid() in (m.home_user_id, m.away_user_id)
  );
$$;

grant execute on function public.is_tournament_creator(uuid) to authenticated;
grant execute on function public.is_tournament_participant(uuid) to authenticated;
grant execute on function public.has_tournament_invitation(uuid) to authenticated;
grant execute on function public.has_tournament_join_request(uuid) to authenticated;
grant execute on function public.can_access_tournament(uuid) to authenticated;
grant execute on function public.is_match_player(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- Limpieza completa de políticas previas en tablas de torneos.
-- Evita dejar mezcladas políticas antiguas con políticas nuevas.
-- -----------------------------------------------------------------------------
alter table public.tournaments enable row level security;
alter table public.tournament_players enable row level security;
alter table public.tournament_invitations enable row level security;
alter table public.tournament_join_requests enable row level security;
alter table public.matches enable row level security;
alter table public.match_goal_events enable row level security;
alter table public.tournament_activity enable row level security;

do $$
declare
  r record;
begin
  for r in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'tournaments',
        'tournament_players',
        'tournament_invitations',
        'tournament_join_requests',
        'matches',
        'match_goal_events',
        'tournament_activity'
      )
  loop
    execute format('drop policy if exists %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;

-- -----------------------------------------------------------------------------
-- Políticas RLS corregidas.
-- -----------------------------------------------------------------------------

-- Torneos. Para la propia tabla tournaments, la condición directa creator_id = auth.uid()
-- permite INSERT ... RETURNING sin depender de consultas recursivas.
create policy tournaments_select_related
on public.tournaments
for select
to authenticated
using (
  creator_id = auth.uid()
  or public.is_tournament_participant(id)
  or public.has_tournament_invitation(id)
  or public.has_tournament_join_request(id)
);

create policy tournaments_insert_own
on public.tournaments
for insert
to authenticated
with check (creator_id = auth.uid());

create policy tournaments_update_creator
on public.tournaments
for update
to authenticated
using (creator_id = auth.uid())
with check (creator_id = auth.uid());

create policy tournaments_delete_creator
on public.tournaments
for delete
to authenticated
using (creator_id = auth.uid());

-- Participantes.
create policy tournament_players_select_related
on public.tournament_players
for select
to authenticated
using (public.can_access_tournament(tournament_id));

create policy tournament_players_insert_related
on public.tournament_players
for insert
to authenticated
with check (
  user_id = auth.uid()
  or public.is_tournament_creator(tournament_id)
);

create policy tournament_players_update_related
on public.tournament_players
for update
to authenticated
using (
  user_id = auth.uid()
  or public.is_tournament_creator(tournament_id)
)
with check (
  user_id = auth.uid()
  or public.is_tournament_creator(tournament_id)
);

create policy tournament_players_delete_related
on public.tournament_players
for delete
to authenticated
using (
  user_id = auth.uid()
  or public.is_tournament_creator(tournament_id)
);

-- Invitaciones.
create policy invitations_select_related
on public.tournament_invitations
for select
to authenticated
using (
  auth.uid() in (from_user_id, to_user_id)
  or public.is_tournament_creator(tournament_id)
);

create policy invitations_insert_creator
on public.tournament_invitations
for insert
to authenticated
with check (
  from_user_id = auth.uid()
  and public.is_tournament_creator(tournament_id)
);

create policy invitations_update_receiver_or_creator
on public.tournament_invitations
for update
to authenticated
using (
  to_user_id = auth.uid()
  or public.is_tournament_creator(tournament_id)
)
with check (
  to_user_id = auth.uid()
  or public.is_tournament_creator(tournament_id)
);

create policy invitations_delete_related
on public.tournament_invitations
for delete
to authenticated
using (
  auth.uid() in (from_user_id, to_user_id)
  or public.is_tournament_creator(tournament_id)
);

-- Solicitudes por código.
create policy join_requests_select_related
on public.tournament_join_requests
for select
to authenticated
using (
  user_id = auth.uid()
  or public.is_tournament_creator(tournament_id)
);

create policy join_requests_insert_self
on public.tournament_join_requests
for insert
to authenticated
with check (user_id = auth.uid());

create policy join_requests_update_related
on public.tournament_join_requests
for update
to authenticated
using (
  user_id = auth.uid()
  or public.is_tournament_creator(tournament_id)
)
with check (
  user_id = auth.uid()
  or public.is_tournament_creator(tournament_id)
);

create policy join_requests_delete_related
on public.tournament_join_requests
for delete
to authenticated
using (
  user_id = auth.uid()
  or public.is_tournament_creator(tournament_id)
);

-- Partidos.
create policy matches_select_related
on public.matches
for select
to authenticated
using (public.can_access_tournament(tournament_id));

create policy matches_insert_creator
on public.matches
for insert
to authenticated
with check (public.is_tournament_creator(tournament_id));

create policy matches_update_creator_or_player
on public.matches
for update
to authenticated
using (
  public.is_tournament_creator(tournament_id)
  or auth.uid() in (home_user_id, away_user_id)
)
with check (
  public.is_tournament_creator(tournament_id)
  or auth.uid() in (home_user_id, away_user_id)
);

create policy matches_delete_creator
on public.matches
for delete
to authenticated
using (public.is_tournament_creator(tournament_id));

-- Goles/asistencias.
create policy goal_events_select_related
on public.match_goal_events
for select
to authenticated
using (public.can_access_tournament(tournament_id));

create policy goal_events_insert_related
on public.match_goal_events
for insert
to authenticated
with check (
  created_by = auth.uid()
  and public.can_access_tournament(tournament_id)
);

create policy goal_events_delete_related
on public.match_goal_events
for delete
to authenticated
using (
  created_by = auth.uid()
  or public.is_tournament_creator(tournament_id)
);

-- Actividad.
create policy activity_select_related
on public.tournament_activity
for select
to authenticated
using (public.can_access_tournament(tournament_id));

create policy activity_insert_related
on public.tournament_activity
for insert
to authenticated
with check (
  user_id = auth.uid()
  and public.can_access_tournament(tournament_id)
);

create policy activity_delete_creator
on public.tournament_activity
for delete
to authenticated
using (public.is_tournament_creator(tournament_id));

-- -----------------------------------------------------------------------------
-- RPC segura para crear torneos.
-- La app usa esta función en vez de insertar directamente en varias tablas.
-- Esto evita errores de RLS al crear torneo + creador + invitaciones.
-- -----------------------------------------------------------------------------
create or replace function public.create_chute_tournament(
  p_name text,
  p_description text default null,
  p_format text default 'league',
  p_visibility text default 'private',
  p_allow_duplicate_teams boolean default false,
  p_team_selection_mode text default 'fixed',
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
  values (v_tournament_id, 'created', 'Se creó el torneo.', v_user_id);

  return v_tournament_id;
end;
$$;

grant execute on function public.create_chute_tournament(text, text, text, text, boolean, text, text, text, text, uuid[]) to authenticated;

-- Permisos base.
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
