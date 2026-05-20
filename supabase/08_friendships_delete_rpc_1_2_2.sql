-- Chute Plataforma 1.2.2
-- Elimina/cancela amistades con una función segura.
-- Soluciona casos donde RLS permite ver/actualizar, pero bloquea el DELETE directo desde la app.

create or replace function public.delete_friendship(friendship_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.friendships
  where id = friendship_id
    and (requester_id = auth.uid() or receiver_id = auth.uid());
end;
$$;

grant execute on function public.delete_friendship(uuid) to authenticated;

alter table public.friendships enable row level security;

drop policy if exists friendships_delete_involved on public.friendships;
create policy friendships_delete_involved
on public.friendships
for delete
using (
  auth.uid() = requester_id
  or auth.uid() = receiver_id
);

grant select, insert, update, delete on public.friendships to authenticated;
