# Supabase - Chute Plataforma 1.0

Orden sugerido:

1. Crear proyecto en Supabase.
2. Activar Auth con email/password.
3. Ejecutar `01_schema.sql`.
4. Ejecutar `02_policies.sql`.
5. Ejecutar `03_seed_teams.sql`.
6. Ejecutar `04_views_rankings.sql`.

## Regla de privacidad

La app no debe mostrar todos los torneos a todos los usuarios. Un usuario puede ver una sala solo si:

- es creador del torneo;
- participa en el torneo;
- fue invitado al torneo;
- solicitó entrar al torneo.

El ranking global debe venir desde vistas agregadas, no desde acceso libre a todas las salas privadas.

## Nota de implementación

La versión 1.0 local conserva la lógica en el navegador. Estos archivos dejan preparada la estructura de base de datos para migrar gradualmente a Supabase Auth y persistencia real.
