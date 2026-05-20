# Chute Plataforma 1.1 - Supabase Auth inicial

Esta versión conecta la app con Supabase Auth para registro e inicio de sesión con correo y contraseña.

## Antes de publicar

En Supabase ejecuta este archivo adicional:

```sql
supabase/05_auth_profile_policy.sql
```

Permite que cada usuario autenticado cree su propio perfil en `profiles`.

## Variables necesarias en Vercel

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu_anon_public_key
```

Después de guardarlas, redeploy en Vercel.

## Alcance de esta versión

Conectado:

- Registro de cuenta.
- Inicio de sesión.
- Cierre de sesión.
- Creación/sincronización de perfil.

Aún pendiente para próximas versiones:

- Guardar amigos en Supabase.
- Guardar torneos en Supabase.
- Guardar partidos, goles y asistencias en Supabase.
- Reemplazar almacenamiento del navegador por datos en nube.

La regla de privacidad se mantiene preparada en SQL: cada usuario debe ver solo torneos creados por él, donde participa, donde fue invitado o donde solicitó acceso.
