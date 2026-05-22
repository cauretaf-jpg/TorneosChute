# Chute Plataforma v1.12.0 - Club Chute y palmarés histórico

## Objetivo

Convertir la plataforma en un producto con memoria histórica, no solamente en un administrador de torneos. La nueva sección **Club Chute** actúa como museo competitivo de la comunidad.

## Funciones agregadas

- Nueva vista `Club Chute` en navegación lateral y navegación inferior.
- Panel principal de historia oficial.
- Último campeón destacado con acceso a la ficha del torneo.
- Métricas generales: temporadas, torneos, finalizados, partidos oficiales, goles oficiales y amistosos.
- Resumen del ciclo vigente con temporada semestral automática.
- Hall de la fama de usuarios y equipos.
- Tabla de temporadas semestrales.
- Últimos campeones registrados.
- Mejores campañas de campeones.
- Futbolistas históricos por goles/asistencias.
- Rivalidades destacadas.
- Récords históricos existentes integrados dentro del museo.
- Ranking amistoso separado del ranking oficial.
- Resumen copiable para WhatsApp.

## Reglas de temporada

La temporada vigente se mantiene automática:

- Enero a junio: `Temporada Apertura AAAA`.
- Julio a diciembre: `Temporada Clausura AAAA`.

La sección Club Chute usa ese catálogo para mostrar ciclos vigentes e históricos.

## Alcance técnico

No requiere SQL nuevo. Usa información ya disponible en el estado local/nube:

- `tournaments`
- `matches`
- `goalEvents`
- `friendlyMatches`
- `seasons`
- `championUserId`
- `championTeamId`
- `historySummary`

## Consideración de producto

Club Chute ayuda a que la página se sienta como una plataforma final:

- permite ver historia acumulada,
- da valor a torneos antiguos,
- resume campeones y temporadas,
- genera contenido compartible,
- separa estadísticas oficiales y amistosas.

## Commit sugerido

```text
Agregar Club Chute y palmarés histórico v1.12.0
```
