-- Chute Plataforma v5 - esquema base Supabase
-- Ejecutar después de habilitar extensiones estándar de Supabase.

create extension if not exists pgcrypto;

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  alias text unique not null,
  full_name text,
  avatar_url text,
  created_at timestamptz default now()
);

create table if not exists teams (
  id text primary key,
  name text not null,
  short_name text,
  badge text,
  tone text,
  coach text,
  is_official boolean default true,
  owner_id uuid references profiles(id) on delete set null,
  created_at timestamptz default now()
);

create table if not exists team_players (
  id uuid primary key default gen_random_uuid(),
  team_id text references teams(id) on delete cascade,
  player_name text not null,
  position text not null,
  unique(team_id, player_name)
);

create table if not exists friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid references profiles(id) on delete cascade,
  receiver_id uuid references profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','rejected')),
  created_at timestamptz default now(),
  responded_at timestamptz,
  unique(requester_id, receiver_id),
  check (requester_id <> receiver_id)
);

create table if not exists tournaments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  format text not null check (format in ('league','league_playoff','groups','knockout')),
  visibility text not null default 'private' check (visibility in ('private','public')),
  status text not null default 'preparing' check (status in ('preparing','active','paused','closed')),
  allow_duplicate_teams boolean default false,
  invite_code text unique not null,
  season text default 'Temporada 2026',
  creator_id uuid references profiles(id) on delete set null,
  champion_user_id uuid references profiles(id) on delete set null,
  champion_team_id text references teams(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists tournament_players (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid references tournaments(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  team_id text references teams(id) on delete restrict,
  joined_by_code boolean default false,
  joined_at timestamptz default now(),
  unique(tournament_id, user_id)
);

create table if not exists tournament_invitations (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid references tournaments(id) on delete cascade,
  from_user_id uuid references profiles(id) on delete cascade,
  to_user_id uuid references profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','rejected')),
  created_at timestamptz default now(),
  responded_at timestamptz,
  unique(tournament_id, to_user_id)
);

create table if not exists tournament_join_requests (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid references tournaments(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  requested_team_id text references teams(id) on delete restrict,
  status text not null default 'pending' check (status in ('pending','accepted','rejected')),
  requested_at timestamptz default now(),
  resolved_at timestamptz,
  resolved_by uuid references profiles(id) on delete set null,
  reason text,
  unique(tournament_id, user_id)
);

create table if not exists matches (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid references tournaments(id) on delete cascade,
  round text not null,
  home_user_id uuid references profiles(id) on delete cascade,
  away_user_id uuid references profiles(id) on delete cascade,
  home_team_id text references teams(id) on delete restrict,
  away_team_id text references teams(id) on delete restrict,
  home_goals int check (home_goals >= 0),
  away_goals int check (away_goals >= 0),
  result_status text check (result_status in ('pending_confirmation','confirmed','rejected')),
  proposed_by uuid references profiles(id) on delete set null,
  confirmed_by uuid references profiles(id) on delete set null,
  played_at date,
  created_at timestamptz default now()
);

create table if not exists match_goal_events (
  id uuid primary key default gen_random_uuid(),
  match_id uuid references matches(id) on delete cascade,
  tournament_id uuid references tournaments(id) on delete cascade,
  team_id text references teams(id) on delete restrict,
  user_id uuid references profiles(id) on delete set null,
  player_name text not null,
  assist_name text,
  minute text,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz default now()
);

create table if not exists tournament_activity (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid references tournaments(id) on delete cascade,
  type text not null,
  message text not null,
  user_id uuid references profiles(id) on delete set null,
  created_at timestamptz default now()
);
-- Chute Plataforma v5 - RLS orientado a privacidad por usuario
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

drop policy if exists activity_select_related on tournament_activity;
create policy activity_select_related on tournament_activity for select using (
  exists (select 1 from tournaments t where t.id = tournament_activity.tournament_id and t.creator_id = auth.uid())
  or exists (select 1 from tournament_players tp where tp.tournament_id = tournament_activity.tournament_id and tp.user_id = auth.uid())
  or exists (select 1 from tournament_invitations ti where ti.tournament_id = tournament_activity.tournament_id and ti.to_user_id = auth.uid())
  or exists (select 1 from tournament_join_requests tjr where tjr.tournament_id = tournament_activity.tournament_id and tjr.user_id = auth.uid())
);
-- Chute Plataforma v5 - vistas agregadas para rankings globales
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
