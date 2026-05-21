# Chute Plataforma 1.6 · Historial competitivo real

Ejecutar en Supabase después de `supabase/14_rankings_1_5.sql`:

```sql
supabase/15_tournament_history_1_6.sql
```

## Qué agrega

- Tabla `tournament_summaries` para guardar la ficha histórica final de cada torneo.
- RPC `close_chute_tournament(...)` para cerrar torneos desde Supabase sin romper RLS.
- Registro persistente de:
  - campeón;
  - subcampeón;
  - mejor ataque;
  - mejor defensa;
  - goleador;
  - máximo asistidor;
  - mejor futbolista por G+A;
  - partidos jugados;
  - goles totales;
  - mayor goleada;
  - partido con más goles.

## Seguridad

La tabla `tournament_summaries` usa RLS. Un usuario solo puede ver el resumen de torneos a los que tiene acceso: creados, participados, invitados o solicitados.

El cierre del torneo solo puede hacerlo el creador mediante `close_chute_tournament`.
