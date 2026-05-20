# Plan de migración a Supabase

## Regla principal de privacidad

Un usuario solo debe ver:

- torneos que creó;
- torneos donde participa;
- torneos donde fue invitado;
- torneos donde solicitó ingreso.

El ranking global puede mostrar datos agregados, pero no debe abrir salas privadas ajenas.

## Fase 1 - Autenticación

- Crear proyecto en Supabase.
- Activar email/password.
- Crear `profiles` al registrar usuario.
- Usar alias único.
- Reemplazar selector local de usuario por sesión real.

## Fase 2 - Lectura de datos

- Leer equipos y plantillas desde Supabase.
- Leer amigos y solicitudes.
- Leer solo torneos visibles según políticas RLS.
- Leer rankings desde vistas agregadas.

## Fase 3 - Escritura de datos

- Crear torneos.
- Invitar usuarios.
- Aceptar/rechazar invitaciones.
- Registrar participantes.
- Registrar partidos.
- Registrar goles/asistencias.
- Finalizar torneos.

## Fase 4 - Publicación

- Configurar variables en Vercel.
- Probar con dos cuentas reales.
- Confirmar que un usuario no puede ver salas ajenas.
- Confirmar que el ranking global sí agrega resultados generales.
