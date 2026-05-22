# Changelog

## 1.11.0 - Temporadas semestrales automáticas
- Nueva sección Temporadas.
- Temporadas Apertura/Clausura calculadas automáticamente por semestre.
- Selector de temporada al crear torneos.
- Resumen de temporada con progreso, campeones, líderes y resultados recientes.
- Amistosos se mantiene como sección paralela sin afectar ranking oficial.

## 1.9.0 - Central del Torneo
- Agrega una Central del Campeonato dentro del resumen de cada torneo.
- Muestra líder actual, fecha actual, progreso de partidos, goleador y mejor defensa.
- Agrega tarjeta de partido destacado con marcador tipo transmisión deportiva.
- Agrega historial resumido entre jugadores dentro del partido destacado.
- Agrega panel de fecha actual con estado de cada partido.
- Mejora accesos rápidos a fixture, tabla, perfil y administración.
- Mantiene intactas las reglas de fixture, Supabase y cierre de torneos.


## 1.8.5 · Inicio tipo producto final

- Rediseño del Inicio como portada principal de la plataforma.
- Nuevo panel visual con campeón reciente, líder global y equipo destacado.
- Nuevas tarjetas para torneos activos, podio global, equipos destacados y futbolistas destacados.
- Mundo Chute se reorganiza como dashboard deportivo general.
- Se reducen textos internos o de explicación técnica en las vistas principales.
- No requiere SQL nuevo.


## 1.8.3 - Perfiles de futbolistas

- Se agregan perfiles competitivos para futbolistas oficiales.
- Las plantillas de equipos permiten seleccionar jugadores y ver su ficha.
- Ranking Goles/Asistencias ahora permite abrir un perfil de futbolista.
- La pestaña Fichas incorpora selector de futbolista.
- Cada ficha muestra goles, asistencias, G+A, torneos, usuarios destacados y últimos registros.

# Changelog

## 1.8.1

- Convierte la sección Equipos en una vista con perfiles competitivos seleccionables.
- Cada equipo ahora puede abrirse para revisar estadísticas, usuarios destacados, últimos partidos, futbolistas históricos, goleadores, asistidores, palmarés y plantilla oficial.
- No requiere SQL nuevo.


## 1.8.0 · Producto final y fixture por fechas

- Se limpió el estado inicial para evitar datos personales o torneos demo en el producto final.
- Se ajustaron textos visibles para evitar referencias técnicas innecesarias.
- Se agrupó el fixture por fechas.
- Cada partido queda resumido y se edita con el botón Ver más.
- Se mantuvo la edición completa de marcador, equipos, goles y asistencias.
- No requiere SQL nuevo.



## 1.7.4 - Finalización robusta de torneos

- Agregada función segura `finish_chute_tournament_safe_v174`.
- La app ahora intenta cierre por RPC nueva, compatibilidad previa y respaldo directo por RLS.
- El resumen histórico se envía desde la app para evitar bloqueos por cálculos SQL complejos.
- Corregida la finalización de torneos cuando funciones anteriores de Supabase fallan o no están disponibles en caché PostgREST.

## 1.7.2
- Corrección robusta del cierre de torneos en Supabase mediante `finish_chute_tournament_v172`.
- El cierre ya no depende de la función anterior si quedó desactualizada en PostgREST.
- El resumen histórico se guarda con una función `security definer` y validación por creador.
- El cierre tolera llaves de playoff con registros auxiliares y usa partidos confirmados para calcular historial.

## 1.7.1
- Se corrigió la finalización de torneos cuando Supabase devuelve 404 por caché/esquema REST.
- Se agregó `supabase/17_fix_finish_tournament_1_7_1.sql`.
- Se simplificaron textos visibles relacionados con definiciones por penales.


## 1.7.0 - Playoffs y definiciones

- Agrega eliminación directa con llave de playoff.
- Permite activar partido por tercer lugar.
- Los empates de playoff exigen ganador por penales.
- Los penales solo definen la llave; no se registran como goles normales.
- La generación de fixture distingue liga/ida-vuelta de eliminación directa.
- Agrega SQL `supabase/16_playoffs_1_7.sql`.

# Changelog

## 1.6.0 · Historial competitivo real

- Agrega tabla `tournament_summaries` para guardar la ficha final de cada torneo en Supabase.
- Agrega RPC `close_chute_tournament` para finalizar torneos y guardar campeón, subcampeón, mejor ataque, mejor defensa, goleador, asistidor y mejor futbolista por G+A.
- La sala del torneo ahora puede mostrar historial persistente guardado en Supabase.
- Mundo Chute incorpora un bloque de palmarés/historial competitivo.
- Ranking agrega pestaña Palmarés.

## 1.5.0
- Agrega rankings reales calculados desde Supabase.
- Ranking global de usuarios desde partidos confirmados.
- Ranking de equipos considerando equipo fijo y equipo libre por partido.
- Ranking usuario + equipo desde el equipo usado en cada partido.
- Goleadores, asistidores y futbolistas históricos desde eventos guardados en Supabase.
- Botón para actualizar ranking desde la vista Ranking.
- Nuevo SQL: `supabase/14_rankings_1_5.sql`.


## 1.4.3

- Agrega modo de fixture: solo ida o ida y vuelta.
- En ida y vuelta, cada cruce genera dos partidos alternando local y visita.
- Guarda `fixture_mode` en Supabase mediante `13_fixture_mode_1_4_3.sql`.
- Mantiene compatibilidad con equipo fijo y equipo libre por partido.

## 1.4.2

- Corrige la creación de torneos en Supabase con una función RPC segura.
- Reinstala políticas RLS de torneos sin recursión y sin bloqueo al insertar.
- Evita el error: `new row violates row-level security policy for table "tournaments"`.
- Mantiene soporte para equipo fijo y equipo libre por partido.

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

## 1.4.1
- Corrige políticas RLS de Supabase que podían generar `infinite recursion detected in policy for relation "tournaments"`.
- Agrega `supabase/11_fix_rls_recursion_1_4_1.sql` con funciones auxiliares seguras para validar acceso a torneos sin recursión.


## 1.7.3

- Corrige el SQL de finalización cuando ya existe una función `close_chute_tournament` con un tipo de retorno anterior.
- Agrega `supabase/19_fix_close_function_signature_1_7_3.sql`.
- Mantiene la función nueva `finish_chute_tournament_v172` como mecanismo principal de cierre.

## 1.8.2 - Perfiles de usuario

- Agrega ficha competitiva detallada para usuarios.
- Permite seleccionar usuarios desde Ranking > Usuarios y ver su perfil.
- Rediseña la pestaña Perfil para mostrar historial competitivo completo.
- Mejora la pestaña Fichas con perfil de usuario completo.
- No requiere SQL nuevo.

## 1.8.4 - Perfil de torneos

- Agrega pestaña Perfil dentro de cada sala de torneo.
- Convierte cada torneo finalizado en una ficha histórica tipo álbum competitivo.
- Mejora el palmarés con tarjetas visuales de torneos cerrados.
- Muestra campeón/líder, podio, tabla, figuras y partidos destacados.
- No requiere SQL nuevo.

## 1.12.0 - Club Chute y palmarés histórico

- Agrega nueva sección `Club Chute` como museo competitivo de la plataforma.
- Consolida temporadas semestrales, palmarés, últimos campeones, mejores campañas y récords históricos.
- Muestra hall de la fama de usuarios y equipos con más títulos.
- Integra futbolistas destacados, rivalidades principales y ranking amistoso no oficial.
- Agrega resumen copiable para WhatsApp.
- No requiere SQL nuevo; funciona con los torneos, temporadas y amistosos ya registrados.
