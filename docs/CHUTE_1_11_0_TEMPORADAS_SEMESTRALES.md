# Chute Plataforma 1.11.0 - Temporadas semestrales

## Objetivo
Agregar un sistema de temporadas semestrales automático, sin tocar la lógica delicada de Supabase ni alterar los torneos existentes.

## Regla de temporada
- Enero a junio: `Temporada Apertura AAAA`.
- Julio a diciembre: `Temporada Clausura AAAA`.

La app calcula la temporada vigente con la fecha del sistema y la usa como valor por defecto al crear torneos.

## Cambios de interfaz
- Nueva vista `Temporadas`.
- Acceso desde menú lateral y menú inferior.
- Selector visual de temporadas disponibles.
- Resumen de temporada con métricas de torneos, progreso, líderes, campeones y resultados recientes.
- Botón para copiar resumen de temporada.

## Compatibilidad
Los torneos antiguos conservan su temporada original si ya tenían una. Los torneos nuevos usan el catálogo semestral.

## Amistosos
La sección de partidos amistosos ya está presente en esta base. Se mantiene como historial paralelo y no afecta ranking oficial ni torneos.
