-- Chute Plataforma 1.0 - esquema base Supabase
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
  logo_path text,
  is_official boolean default true,
  owner_id uuid references profiles(id) on delete set null,
  created_at timestamptz default now()
);

create table if not exists team_players (
  id uuid primary key default gen_random_uuid(),
  team_id text references teams(id) on delete cascade,
  player_name text not null,
  position text not null,
  photo_path text,
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
