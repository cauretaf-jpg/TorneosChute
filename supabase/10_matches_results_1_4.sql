-- Chute Plataforma 1.4 · Fixture, partidos y resultados en Supabase
-- Ejecutar después de supabase/09_tournaments_1_3.sql.

alter table public.matches
  add column if not exists proposed_home_goals int check (proposed_home_goals is null or proposed_home_goals >= 0),
  add column if not exists proposed_away_goals int check (proposed_away_goals is null or proposed_away_goals >= 0),
  add column if not exists sort_order int default 0,
  add column if not exists rejected_by uuid references public.profiles(id) on delete set null,
  add column if not exists rejected_at timestamptz,
  add column if not exists updated_at timestamptz default now();

alter table public.match_goal_events
  add column if not exists side text default 'home';

alter table public.match_goal_events
  drop constraint if exists match_goal_events_side_check;

alter table public.match_goal_events
  add constraint match_goal_events_side_check
  check (side in ('home','away'));

create index if not exists matches_tournament_order_idx on public.matches(tournament_id, sort_order);
create index if not exists match_goal_events_match_idx on public.match_goal_events(match_id);
create index if not exists tournament_activity_tournament_idx on public.tournament_activity(tournament_id, created_at desc);

drop policy if exists activity_insert_related on public.tournament_activity;
create policy activity_insert_related
on public.tournament_activity
for insert
with check (
  user_id = auth.uid()
  and (
    exists (select 1 from public.tournaments t where t.id = tournament_activity.tournament_id and t.creator_id = auth.uid())
    or exists (select 1 from public.tournament_players tp where tp.tournament_id = tournament_activity.tournament_id and tp.user_id = auth.uid())
    or exists (select 1 from public.tournament_invitations ti where ti.tournament_id = tournament_activity.tournament_id and ti.to_user_id = auth.uid())
  )
);

drop policy if exists activity_delete_creator on public.tournament_activity;
create policy activity_delete_creator
on public.tournament_activity
for delete
using (
  exists (select 1 from public.tournaments t where t.id = tournament_activity.tournament_id and t.creator_id = auth.uid())
);

grant select, insert, update, delete on public.matches to authenticated;
grant select, insert, update, delete on public.match_goal_events to authenticated;
grant select, insert, delete on public.tournament_activity to authenticated;
