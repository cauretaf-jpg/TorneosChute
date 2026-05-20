-- Chute Plataforma 1.4.1 · Corrección RLS sin recursión
-- Ejecutar después de supabase/10_matches_results_1_4.sql.
-- Corrige: infinite recursion detected in policy for relation "tournaments".

-- Funciones auxiliares SECURITY DEFINER para consultar relaciones sin disparar recursión RLS.
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

create or replace function public.can_access_tournament(p_tournament_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    exists (
      select 1
      from public.tournaments t
      where t.id = p_tournament_id
        and t.creator_id = auth.uid()
    )
    or exists (
      select 1
      from public.tournament_players tp
      where tp.tournament_id = p_tournament_id
        and tp.user_id = auth.uid()
    )
    or exists (
      select 1
      from public.tournament_invitations ti
      where ti.tournament_id = p_tournament_id
        and ti.to_user_id = auth.uid()
    )
    or exists (
      select 1
      from public.tournament_join_requests tjr
      where tjr.tournament_id = p_tournament_id
        and tjr.user_id = auth.uid()
    );
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
grant execute on function public.can_access_tournament(uuid) to authenticated;
grant execute on function public.is_match_player(uuid) to authenticated;

-- Asegurar RLS.
alter table public.tournaments enable row level security;
alter table public.tournament_players enable row level security;
alter table public.tournament_invitations enable row level security;
alter table public.tournament_join_requests enable row level security;
alter table public.matches enable row level security;
alter table public.match_goal_events enable row level security;
alter table public.tournament_activity enable row level security;

-- Eliminar políticas anteriores que se consultaban entre sí y generaban recursión.
drop policy if exists tournaments_select_related on public.tournaments;
drop policy if exists tournaments_insert_own on public.tournaments;
drop policy if exists tournaments_update_creator on public.tournaments;
drop policy if exists tournaments_delete_creator on public.tournaments;

drop policy if exists tournament_players_select_related on public.tournament_players;
drop policy if exists tournament_players_insert_creator on public.tournament_players;
drop policy if exists tournament_players_update_related on public.tournament_players;
drop policy if exists tournament_players_delete_related on public.tournament_players;

drop policy if exists invitations_select_related on public.tournament_invitations;
drop policy if exists invitations_insert_creator on public.tournament_invitations;
drop policy if exists invitations_update_receiver_or_creator on public.tournament_invitations;
drop policy if exists invitations_delete_related on public.tournament_invitations;

drop policy if exists join_requests_select_related on public.tournament_join_requests;
drop policy if exists join_requests_insert_self on public.tournament_join_requests;
drop policy if exists join_requests_update_creator on public.tournament_join_requests;
drop policy if exists join_requests_delete_related on public.tournament_join_requests;

drop policy if exists matches_select_related on public.matches;
drop policy if exists matches_insert_creator on public.matches;
drop policy if exists matches_delete_creator on public.matches;
drop policy if exists matches_update_creator_or_player on public.matches;

drop policy if exists goal_events_select_related on public.match_goal_events;
drop policy if exists goal_events_insert_related on public.match_goal_events;
drop policy if exists goal_events_delete_related on public.match_goal_events;

drop policy if exists activity_select_related on public.tournament_activity;
drop policy if exists activity_insert_related on public.tournament_activity;
drop policy if exists activity_delete_creator on public.tournament_activity;

-- Torneos: visibles solo para creador, participantes, invitados o solicitantes.
create policy tournaments_select_related
on public.tournaments
for select
to authenticated
using (public.can_access_tournament(id));

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

grant select, insert, update, delete on public.tournaments to authenticated;
grant select, insert, update, delete on public.tournament_players to authenticated;
grant select, insert, update, delete on public.tournament_invitations to authenticated;
grant select, insert, update, delete on public.tournament_join_requests to authenticated;
grant select, insert, update, delete on public.matches to authenticated;
grant select, insert, delete on public.match_goal_events to authenticated;
grant select, insert, delete on public.tournament_activity to authenticated;
