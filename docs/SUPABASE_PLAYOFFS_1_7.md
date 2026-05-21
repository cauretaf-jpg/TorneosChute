# Chute Plataforma 1.7 · Playoffs y definiciones

Ejecutar en Supabase después de `supabase/15_tournament_history_1_6.sql`:

```sql
supabase/16_playoffs_1_7.sql
```

## Cambios

- Agrega opción `third_place_enabled` en torneos.
- Agrega metadatos de llave en `matches`.
- Permite eliminación directa con semifinales/final y partido por tercer lugar opcional.
- Los empates en eliminación directa exigen elegir ganador por penales.
- Los penales solo definen al ganador del playoff; no se registran como goles normales, autogoles ni eventos de partido.

## Restricción de esta versión

La eliminación directa requiere cantidad de participantes potencia de 2: 2, 4, 8 o 16.
