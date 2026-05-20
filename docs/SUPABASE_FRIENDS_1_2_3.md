# Chute Plataforma 1.2.3 · Corrección de amistades locales

Esta versión corrige un caso de compatibilidad entre datos antiguos guardados en el navegador y amistades reales de Supabase.

## Problema corregido

Algunos navegadores podían conservar amistades antiguas del modo local con identificadores como `f_eg2i3od6_mpem6opd`.
Cuando el usuario intentaba eliminar esa amistad mientras Supabase estaba activo, la app enviaba ese identificador a la función `delete_friendship`, que espera un UUID real de Supabase.

Resultado anterior:

```txt
invalid input syntax for type uuid: "f_..."
```

## Solución

- En modo Supabase, la pantalla de amigos filtra y muestra solo amistades reales con `cloud: true`.
- Si queda una amistad local antigua, la app la elimina del estado local sin enviarla a Supabase.
- Los rankings entre amigos usan solo amistades de Supabase cuando hay sesión iniciada.

No requiere SQL nuevo si ya se ejecutó `08_friendships_delete_rpc_1_2_2.sql`.
