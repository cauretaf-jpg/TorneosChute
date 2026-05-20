-- Chute Plataforma 1.0 - RLS orientado a privacidad por usuario
-- Regla: los torneos NO se listan para todo el mundo. Se ven si el usuario es creador,
-- participante, invitado o solicitante. Los rankings globales deben salir de vistas agregadas.

alter table profiles enable row level security;
alter table teams enable row level security;
alter table team_players enable row level security;
alter table friendships enable row level security;
alter table tournaments enable row level security;
alter table tournament_players enable row level security;
alter table tournament_invitations enable row level security;
alter table tournament_join_requests enable row level security;
alter table matches enable row level security;
alter table match_goal_events enable row level security;
alter table tournament_activity enable row level security;

drop policy if exists profiles_select_all on profiles;
create policy profiles_select_all on profiles for select using (true);

drop policy if exists profiles_update_own on profiles;
create policy profiles_update_own on profiles for update using (auth.uid() = id);

drop policy if exists teams_select_all on teams;
create policy teams_select_all on teams for select using (true);

drop policy if exists team_players_select_all on team_players;
create policy team_players_select_all on team_players for select using (true);

drop policy if exists friendships_select_involved on friendships;
create policy friendships_select_involved on friendships for select using (auth.uid() in (requester_id, receiver_id));

drop policy if exists friendships_insert_self on friendships;
create policy friendships_insert_self on friendships for insert with check (auth.uid() = requester_id);

drop policy if exists friendships_update_receiver on friendships;
create policy friendships_update_receiver on friendships for update using (auth.uid() = receiver_id);

-- Torneos: no basta con visibility='public'. La app no debe mostrar todas las salas.
drop policy if exists tournaments_select_related on tournaments;
create policy tournaments_select_related on tournaments for select using (
  creator_id = auth.uid()
  or exists (select 1 from tournament_players tp where tp.tournament_id = tournaments.id and tp.user_id = auth.uid())
  or exists (select 1 from tournament_invitations ti where ti.tournament_id = tournaments.id and ti.to_user_id = auth.uid())
  or exists (select 1 from tournament_join_requests tjr where tjr.tournament_id = tournaments.id and tjr.user_id = auth.uid())
);

drop policy if exists tournaments_insert_own on tournaments;
create policy tournaments_insert_own on tournaments for insert with check (creator_id = auth.uid());

drop policy if exists tournaments_update_creator on tournaments;
create policy tournaments_update_creator on tournaments for update using (creator_id = auth.uid());



drop policy if exists tournaments_delete_creator on tournaments;
create policy tournaments_delete_creator on tournaments for delete using (creator_id = auth.uid());


drop policy if exists tournament_players_select_related on tournament_players;
create policy tournament_players_select_related on tournament_players for select using (
  user_id = auth.uid()
  or exists (select 1 from tournaments t where t.id = tournament_players.tournament_id and t.creator_id = auth.uid())
  or exists (select 1 from tournament_players mine where mine.tournament_id = tournament_players.tournament_id and mine.user_id = auth.uid())
);

drop policy if exists tournament_players_insert_creator on tournament_players;
create policy tournament_players_insert_creator on tournament_players for insert with check (
  user_id = auth.uid()
  or exists (select 1 from tournaments t where t.id = tournament_players.tournament_id and t.creator_id = auth.uid())
);

drop policy if exists invitations_select_related on tournament_invitations;
create policy invitations_select_related on tournament_invitations for select using (auth.uid() in (from_user_id, to_user_id));

drop policy if exists invitations_insert_creator on tournament_invitations;
create policy invitations_insert_creator on tournament_invitations for insert with check (
  from_user_id = auth.uid()
  and exists (select 1 from tournaments t where t.id = tournament_invitations.tournament_id and t.creator_id = auth.uid())
);

drop policy if exists invitations_update_receiver_or_creator on tournament_invitations;
create policy invitations_update_receiver_or_creator on tournament_invitations for update using (
  to_user_id = auth.uid()
  or exists (select 1 from tournaments t where t.id = tournament_invitations.tournament_id and t.creator_id = auth.uid())
);

drop policy if exists join_requests_select_related on tournament_join_requests;
create policy join_requests_select_related on tournament_join_requests for select using (
  user_id = auth.uid()
  or exists (select 1 from tournaments t where t.id = tournament_join_requests.tournament_id and t.creator_id = auth.uid())
);

drop policy if exists join_requests_insert_self on tournament_join_requests;
create policy join_requests_insert_self on tournament_join_requests for insert with check (user_id = auth.uid());

drop policy if exists join_requests_update_creator on tournament_join_requests;
create policy join_requests_update_creator on tournament_join_requests for update using (
  exists (select 1 from tournaments t where t.id = tournament_join_requests.tournament_id and t.creator_id = auth.uid())
);

drop policy if exists matches_select_related on matches;
create policy matches_select_related on matches for select using (
  exists (select 1 from tournaments t where t.id = matches.tournament_id and t.creator_id = auth.uid())
  or exists (select 1 from tournament_players tp where tp.tournament_id = matches.tournament_id and tp.user_id = auth.uid())
  or exists (select 1 from tournament_invitations ti where ti.tournament_id = matches.tournament_id and ti.to_user_id = auth.uid())
  or exists (select 1 from tournament_join_requests tjr where tjr.tournament_id = matches.tournament_id and tjr.user_id = auth.uid())
);



drop policy if exists matches_insert_creator on matches;
create policy matches_insert_creator on matches for insert with check (
  exists (select 1 from tournaments t where t.id = matches.tournament_id and t.creator_id = auth.uid())
);

drop policy if exists matches_delete_creator on matches;
create policy matches_delete_creator on matches for delete using (
  exists (select 1 from tournaments t where t.id = matches.tournament_id and t.creator_id = auth.uid())
);


drop policy if exists matches_update_creator_or_player on matches;
create policy matches_update_creator_or_player on matches for update using (
  exists (select 1 from tournaments t where t.id = matches.tournament_id and t.creator_id = auth.uid())
  or auth.uid() in (home_user_id, away_user_id)
);

drop policy if exists goal_events_select_related on match_goal_events;
create policy goal_events_select_related on match_goal_events for select using (
  exists (select 1 from tournaments t where t.id = match_goal_events.tournament_id and t.creator_id = auth.uid())
  or exists (select 1 from tournament_players tp where tp.tournament_id = match_goal_events.tournament_id and tp.user_id = auth.uid())
);

drop policy if exists goal_events_insert_related on match_goal_events;
create policy goal_events_insert_related on match_goal_events for insert with check (
  created_by = auth.uid()
  and (
    exists (select 1 from tournaments t where t.id = match_goal_events.tournament_id and t.creator_id = auth.uid())
    or exists (select 1 from tournament_players tp where tp.tournament_id = match_goal_events.tournament_id and tp.user_id = auth.uid())
  )
);



drop policy if exists goal_events_delete_related on match_goal_events;
create policy goal_events_delete_related on match_goal_events for delete using (
  created_by = auth.uid()
  or exists (select 1 from tournaments t where t.id = match_goal_events.tournament_id and t.creator_id = auth.uid())
);


drop policy if exists activity_select_related on tournament_activity;
create policy activity_select_related on tournament_activity for select using (
  exists (select 1 from tournaments t where t.id = tournament_activity.tournament_id and t.creator_id = auth.uid())
  or exists (select 1 from tournament_players tp where tp.tournament_id = tournament_activity.tournament_id and tp.user_id = auth.uid())
  or exists (select 1 from tournament_invitations ti where ti.tournament_id = tournament_activity.tournament_id and ti.to_user_id = auth.uid())
  or exists (select 1 from tournament_join_requests tjr where tjr.tournament_id = tournament_activity.tournament_id and tjr.user_id = auth.uid())
);

-- Permite que un usuario autenticado cree su propio perfil al registrarse.
drop policy if exists profiles_insert_own on profiles;
create policy profiles_insert_own on profiles for insert with check (auth.uid() = id);

drop policy if exists profiles_update_own on profiles;
create policy profiles_update_own on profiles for update using (auth.uid() = id) with check (auth.uid() = id);
