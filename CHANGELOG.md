
## 1.1.1 - Corrección de perfil activo Supabase

- Corrige la tarjeta de usuario activo para que use el perfil conectado con Supabase.
- Evita que, al iniciar sesión con otra cuenta, siga apareciendo el usuario local anterior.
- Agrega respaldo visual usando metadata de la sesión si el perfil tarda en sincronizar.

# Changelog

## 1.0.0

- Consolidación de versión estable local.
- QA automático de estructura, assets, equipos y jugadores.
- Error Boundary para recuperación de errores de interfaz.
- `vercel.json` agregado para publicación SPA.
- Documentación de QA, Vercel y migración a Supabase.
- Supabase actualizado con equipos oficiales, logos, 85 jugadores y fotos.
- Políticas RLS reforzadas para visibilidad privada de torneos.
- Mantiene logos reales y fotos de jugadores.
- Mantiene sala vertical: acciones rápidas, mis salas y detalle del torneo.

## 1.1.0 - Supabase Auth inicial

- Se agregó conexión inicial con Supabase Auth mediante variables `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
- Se agregó acceso con correo y contraseña.
- Se agregó creación de cuenta real con nombre y alias.
- Al iniciar sesión, se crea o sincroniza el perfil en la tabla `profiles`.
- Mientras no se haya migrado toda la lógica a nube, los torneos siguen funcionando con almacenamiento del navegador.
- Se agregó `supabase/05_auth_profile_policy.sql` para permitir que cada usuario cree su propio perfil.
