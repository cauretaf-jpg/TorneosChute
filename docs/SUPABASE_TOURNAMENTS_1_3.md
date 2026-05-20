# Chute Plataforma 1.3 · Torneos en Supabase

Esta versión agrega la base para crear salas reales en Supabase y define el modo de elección de equipos.

## Antes de subir a GitHub

Ejecutar en Supabase SQL Editor:

```text
supabase/09_tournaments_1_3.sql
```

## Modos de equipos

### Equipo fijo
El participante elige un equipo al entrar al torneo y lo mantiene hasta el final.

### Equipo libre por partido
El participante no queda amarrado a un equipo. El equipo se define en cada partido.

## Alcance de esta versión

- Crear torneos en Supabase.
- Guardar creador real.
- Guardar participantes iniciales.
- Guardar invitaciones a amigos reales.
- Mostrar salas visibles para el usuario conectado.
- Preparar estructura para que en la etapa siguiente se migren partidos, resultados, goles y asistencias.

## Privacidad

Los torneos siguen protegidos por RLS: cada usuario ve solo salas creadas por él, salas donde participa, salas donde fue invitado o salas donde solicitó acceso.
