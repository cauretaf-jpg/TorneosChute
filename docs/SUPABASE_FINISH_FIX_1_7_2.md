# Chute Plataforma 1.7.2 · Finalización robusta

Ejecutar en Supabase después de la versión 1.7.1:

```sql
supabase/18_finish_tournament_v172.sql
```

Esta actualización crea una función nueva `finish_chute_tournament_v172` para cerrar torneos desde una función segura en Supabase.

## Qué corrige

- Evita depender de la firma/cache de `close_chute_tournament` si PostgREST quedó desactualizado.
- Finaliza torneos con una función `security definer` validando que el usuario sea el creador.
- Guarda el resumen histórico en `tournament_summaries`.
- Actualiza `tournaments.status`, `champion_user_id` y `champion_team_id`.
- Tolera registros auxiliares de llaves/playoff y calcula historial usando partidos confirmados.

## Después de ejecutar

1. Reemplazar archivos del proyecto.
2. Subir a GitHub.
3. Esperar el deploy de Vercel.
4. Probar finalizar un torneo ya completo.
