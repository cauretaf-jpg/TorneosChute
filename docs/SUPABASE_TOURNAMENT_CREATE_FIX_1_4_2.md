# Chute Plataforma 1.4.2 · Corrección creación de torneos

Ejecutar `supabase/12_fix_tournament_create_1_4_2.sql` después de la 1.4.1.

Esta actualización corrige el error:

```text
new row violates row-level security policy for table "tournaments"
```

Cambios principales:

- Limpia políticas RLS antiguas de las tablas de torneos.
- Reinstala políticas sin recursión.
- Agrega la función segura `create_chute_tournament(...)`.
- La app crea torneos mediante RPC, no insertando directamente en varias tablas.
- Mantiene la privacidad: cada usuario ve solo torneos creados, participados, invitados o solicitados.
