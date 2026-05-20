# Chute Plataforma 1.4 · Partidos y resultados en Supabase

Ejecutar en Supabase SQL Editor:

```text
supabase/10_matches_results_1_4.sql
```

Esta versión guarda en Supabase:

- fixture generado por el creador;
- partidos del torneo;
- marcador confirmado por el creador;
- propuesta de resultado por participantes;
- confirmación/rechazo de resultados;
- goles y asistencias por jugador;
- equipos por partido en torneos con equipo libre;
- estado del torneo y campeón al finalizar.

Regla de modo de equipos:

- `fixed`: el equipo queda en `tournament_players.team_id`.
- `free_per_match`: el equipo queda en `matches.home_team_id` y `matches.away_team_id`.

No se agregan tiros libres, autogoles ni penales como eventos normales. Los penales quedan reservados para futuras definiciones de playoff.
