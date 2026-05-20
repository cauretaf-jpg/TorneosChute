-- Chute Plataforma 1.1 - permisos mínimos para crear perfil al registrar cuenta
-- Ejecutar después de 01_schema.sql y 02_policies.sql.

alter table profiles enable row level security;

drop policy if exists profiles_insert_own on profiles;
create policy profiles_insert_own on profiles
on profiles for insert
with check (auth.uid() = id);

drop policy if exists profiles_update_own on profiles;
create policy profiles_update_own on profiles
on profiles for update
using (auth.uid() = id)
with check (auth.uid() = id);
