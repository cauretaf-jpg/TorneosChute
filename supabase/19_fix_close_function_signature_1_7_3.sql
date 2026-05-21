-- Chute Plataforma 1.7.3 · Corrección firma close_chute_tournament
-- Ejecutar si Supabase muestra:
-- ERROR: cannot change return type of existing function
-- HINT: Use DROP FUNCTION close_chute_tournament(uuid,uuid,text) first.

drop function if exists public.close_chute_tournament(uuid, uuid, text);

create or replace function public.close_chute_tournament(
  p_tournament_id uuid,
  p_champion_user_id uuid default null,
  p_champion_team_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  return public.finish_chute_tournament_v172(
    p_tournament_id,
    p_champion_user_id,
    p_champion_team_id
  );
end;
$$;

grant execute on function public.close_chute_tournament(uuid, uuid, text) to authenticated;

notify pgrst, 'reload schema';
