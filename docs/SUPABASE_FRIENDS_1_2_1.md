# Chute Plataforma 1.2.1 · Eliminar amistades

Esta actualización agrega la acción para eliminar una amistad aceptada o cancelar una solicitud pendiente.

## SQL requerido

Ejecutar en Supabase SQL Editor:

```sql
supabase/07_friendships_delete_1_2_1.sql
```

## Resultado esperado

- Un usuario puede eliminar una amistad aceptada.
- Un usuario puede cancelar una solicitud enviada.
- Una solicitud rechazada se elimina para permitir una nueva solicitud futura.
- Después de eliminar, cualquiera de los dos usuarios puede enviar nuevamente una solicitud.
