# Chute Plataforma 1.5 · Rankings reales

Ejecutar en Supabase:

```sql
supabase/14_rankings_1_5.sql
```

Esta versión agrega funciones de ranking agregado:

- `get_chute_user_ranking`
- `get_chute_team_ranking`
- `get_chute_user_team_ranking`
- `get_chute_player_ranking`

Las funciones devuelven estadísticas agregadas desde partidos confirmados. No entregan el detalle de salas privadas completas; solo métricas competitivas para ranking.

## Regla de cálculo

- Victoria: 3 puntos
- Empate: 1 punto
- Derrota: 0 puntos
- Título: +20 al score competitivo
- Victoria: +2 adicional al score competitivo
- Ranking principal de usuarios: mínimo 5 PJ para quedar “Clasificado”

## Equipo fijo y equipo libre

En modo equipo fijo, el equipo usado viene del partido generado desde el participante.
En modo equipo libre por partido, el equipo usado se lee directamente desde `matches.home_team_id` y `matches.away_team_id`.
