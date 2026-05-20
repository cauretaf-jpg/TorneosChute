## 1.4.0 - Partidos y resultados en Supabase

- Guarda el fixture del torneo en Supabase.
- Guarda marcadores, correcciones y resultados confirmados en Supabase.
- Permite propuestas de resultado por participantes y confirmación/rechazo.
- Guarda goles y asistencias reales por partido en `match_goal_events`.
- En torneos de equipo libre, guarda el equipo usado por cada jugador en cada partido.
- Permite finalizar/reabrir/pausar torneos actualizando el estado en Supabase.
- Agrega SQL `10_matches_results_1_4.sql`.


## 1.2.3 - Corrección de amistades locales mezcladas con Supabase

- Evita que las amistades antiguas del modo local aparezcan cuando hay sesión de Supabase activa.
- Corrige el error `invalid input syntax for type uuid` al intentar eliminar amistades con identificadores locales `f_...`.
- El ranking y la vista de amigos ahora usan solo amistades reales de Supabase cuando el usuario está autenticado.
- Mantiene compatibilidad con datos locales anteriores sin enviarlos a las funciones RPC de Supabase.

# Changelog

## 1.3.0
- Agrega creación inicial de torneos en Supabase.
- Agrega modo de equipos: equipo fijo o equipo libre por partido.
- Permite crear torneos donde el usuario no queda asociado a un equipo único.
- Ajusta fixture local para soportar partidos con equipos seleccionables.
- Agrega SQL `09_tournaments_1_3.sql` para preparar la base de datos.


## 1.2.2

- Corrige eliminación/cancelación de amistades en Supabase mediante función RPC segura.
- Mantiene respaldo con DELETE directo si la función aún no existe.
- Agrega `supabase/08_friendships_delete_rpc_1_2_2.sql`.

## 1.2.0 - Amigos reales con Supabase

- Agrega búsqueda de usuarios registrados por alias o nombre público.
- Permite enviar solicitudes de amistad reales guardadas en Supabase.
- Permite aceptar o rechazar solicitudes recibidas.
- La lista de amigos ahora se sincroniza con la tabla `friendships`.
- El ranking entre amigos queda preparado para usar relaciones reales.
- Mantiene los torneos en modo navegador mientras se prepara la migración de torneos a Supabase.


## 1.1.2

- Oculta el selector de usuarios locales cuando Supabase está disponible.
- La cuenta activa ahora queda vinculada visualmente solo al usuario autenticado.
- Si no hay sesión, la cabecera muestra estado sin sesión en vez de usuarios de prueba/locales.


## 1.1.1 - Corrección de perfil activo Supabase

- Corrige la tarjeta de usuario activo para que use el perfil conectado con Supabase.
- Evita que, al iniciar sesión con otra cuenta, siga apareciendo el usuario local anterior.
- Agrega respaldo visual usando metadata de la sesión si el perfil tarda en sincronizar.

# Changelog

## 1.3.0
- Agrega creación inicial de torneos en Supabase.
- Agrega modo de equipos: equipo fijo o equipo libre por partido.
- Permite crear torneos donde el usuario no queda asociado a un equipo único.
- Ajusta fixture local para soportar partidos con equipos seleccionables.
- Agrega SQL `09_tournaments_1_3.sql` para preparar la base de datos.


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

## 1.2.1

- Agrega botón para eliminar amistades aceptadas.
- Agrega botón para cancelar solicitudes de amistad enviadas.
- Al rechazar una solicitud real, se elimina el registro para permitir nuevas solicitudes futuras.
- Agrega política RLS de eliminación para relaciones de amistad.
