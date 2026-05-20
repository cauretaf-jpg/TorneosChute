# Chute Plataforma 1.4.1 · Corrección RLS

Ejecutar después de `supabase/10_matches_results_1_4.sql` si aparece el error:

```text
infinite recursion detected in policy for relation "tournaments"
```

Archivo:

```text
supabase/11_fix_rls_recursion_1_4_1.sql
```

La corrección reemplaza políticas que consultaban tablas relacionadas entre sí por funciones auxiliares `SECURITY DEFINER`, evitando recursión entre `tournaments`, `tournament_players`, `matches`, `match_goal_events` y `tournament_activity`.

Después de ejecutarlo, probar:

1. Crear torneo.
2. Invitar amigo.
3. Aceptar invitación.
4. Generar fixture.
5. Registrar resultado.
6. Agregar goles/asistencias.
