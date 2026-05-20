# Chute Plataforma 1.2.2 · Eliminación de amistades

Ejecutar en Supabase SQL Editor:

```text
supabase/08_friendships_delete_rpc_1_2_2.sql
```

Este ajuste agrega la función `public.delete_friendship(friendship_id uuid)` para eliminar o cancelar amistades/soldicitudes desde la app sin quedar bloqueado por RLS.

Flujo esperado:

1. Usuario A y Usuario B son amigos.
2. Usuario A presiona **Eliminar**.
3. La fila se elimina de `public.friendships`.
4. Ambos usuarios pueden volver a enviarse solicitud.
