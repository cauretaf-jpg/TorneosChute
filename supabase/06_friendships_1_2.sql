-- Chute Plataforma 1.2 - refuerzo para amigos reales
-- Ejecutar después de 05_auth_profile_policy.sql.

alter table profiles enable row level security;
alter table friendships enable row level security;

-- Perfiles visibles para permitir búsqueda por alias/nombre público.
drop policy if exists profiles_select_all on profiles;
create policy profiles_select_all on profiles
on profiles for select
using (true);

-- Cada usuario ve solamente las solicitudes donde participa.
drop policy if exists friendships_select_involved on friendships;
create policy friendships_select_involved on friendships
on friendships for select
using (auth.uid() in (requester_id, receiver_id));

-- Cada usuario autenticado puede enviar solicitudes en su propio nombre.
drop policy if exists friendships_insert_self on friendships;
create policy friendships_insert_self on friendships
on friendships for insert
with check (auth.uid() = requester_id and requester_id <> receiver_id);

-- El receptor puede aceptar o rechazar la solicitud.
drop policy if exists friendships_update_receiver on friendships;
create policy friendships_update_receiver on friendships
on friendships for update
using (auth.uid() = receiver_id)
with check (auth.uid() = receiver_id);

create index if not exists friendships_requester_idx on friendships(requester_id);
create index if not exists friendships_receiver_idx on friendships(receiver_id);
create index if not exists friendships_status_idx on friendships(status);
