# Chute Plataforma 1.7.3 · Corrección firma de función

Este ajuste corrige el error de PostgreSQL:

```text
cannot change return type of existing function
HINT: Use DROP FUNCTION close_chute_tournament(uuid,uuid,text) first.
```

Ejecutar en Supabase:

```text
supabase/19_fix_close_function_signature_1_7_3.sql
```

Luego volver a probar **Finalizar torneo** desde la app publicada.
