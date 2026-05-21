# Chute Plataforma 1.4.3 · Fixture solo ida / ida y vuelta

Ejecutar en Supabase después de `12_fix_tournament_create_1_4_2.sql`:

```sql
supabase/13_fixture_mode_1_4_3.sql
```

## Cambios

- Agrega `tournaments.fixture_mode`.
- Valores permitidos:
  - `single_leg`: solo ida.
  - `double_leg`: ida y vuelta.
- Actualiza la función `create_chute_tournament` para guardar el modo de fixture al crear una sala.
- La app genera dos partidos por cruce cuando el torneo está configurado como ida y vuelta.

## Consideración

El modo de equipos sigue siendo independiente:

- Equipo fijo: cada usuario mantiene un equipo durante todo el torneo.
- Equipo libre por partido: el equipo se elige en cada partido.

El fixture ida/vuelta funciona con ambos modos.
