# Chute Plataforma 1.7.4 · Finalización segura

Esta actualización corrige el cierre de torneos desde dos frentes:

1. Agrega la función `finish_chute_tournament_safe_v174`, que solo valida que el usuario sea creador y guarda el cierre con el resumen calculado por la app.
2. La app usa una cadena de respaldo: función nueva, funciones anteriores y, si todo falla, actualización directa del torneo por RLS.

## SQL requerido

Ejecutar en Supabase:

```sql
supabase/20_finish_tournament_safe_1_7_4.sql
```

## Validación

Luego de ejecutar el SQL y desplegar la app:

1. Crear o abrir un torneo con partidos confirmados.
2. Finalizar torneo desde el panel del creador.
3. Confirmar que `tournaments.status = 'closed'`.
4. Confirmar que existe registro en `tournament_summaries`.
