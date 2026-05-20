-- Chute Plataforma 1.3 · Torneos en Supabase y modo de equipos
-- Ejecutar después de 08_friendships_delete_rpc_1_2_2.sql.

create extension if not exists pgcrypto;

alter table public.tournaments
  add column if not exists team_selection_mode text not null default 'fixed';

alter table public.tournaments
  drop constraint if exists tournaments_team_selection_mode_check;

alter table public.tournaments
  add constraint tournaments_team_selection_mode_check
  check (team_selection_mode in ('fixed','free_per_match'));

-- En modo equipo libre, el equipo del usuario puede quedar vacío al entrar al torneo.
alter table public.tournament_players
  alter column team_id drop not null;

alter table public.tournament_join_requests
  alter column requested_team_id drop not null;

-- En modo equipo libre, el equipo se define por partido.
alter table public.matches
  alter column home_team_id drop not null,
  alter column away_team_id drop not null;

create index if not exists tournaments_creator_idx on public.tournaments(creator_id);
create index if not exists tournaments_invite_code_idx on public.tournaments(invite_code);
create index if not exists tournaments_team_selection_mode_idx on public.tournaments(team_selection_mode);
create index if not exists tournament_players_tournament_user_idx on public.tournament_players(tournament_id, user_id);
create index if not exists tournament_invitations_to_user_idx on public.tournament_invitations(to_user_id);
create index if not exists tournament_join_requests_user_idx on public.tournament_join_requests(user_id);

grant select, insert, update, delete on public.tournaments to authenticated;
grant select, insert, update, delete on public.tournament_players to authenticated;
grant select, insert, update, delete on public.tournament_invitations to authenticated;
grant select, insert, update, delete on public.tournament_join_requests to authenticated;
grant select, insert, update, delete on public.matches to authenticated;
