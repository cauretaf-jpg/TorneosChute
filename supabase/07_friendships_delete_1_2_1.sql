-- Chute Plataforma 1.2.1
-- Permite eliminar/cancelar amistades y solicitudes para poder volver a enviar solicitud.

alter table public.friendships enable row level security;

drop policy if exists friendships_delete_involved on public.friendships;
create policy friendships_delete_involved
on public.friendships
for delete
using (
  auth.uid() = requester_id
  or auth.uid() = receiver_id
);

grant delete on public.friendships to authenticated;
