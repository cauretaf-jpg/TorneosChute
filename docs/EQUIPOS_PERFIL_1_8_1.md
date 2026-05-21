# Chute Plataforma 1.8.1 · Perfiles de equipos

## Cambios

- La sección **Equipos** ahora permite seleccionar cada club oficial.
- Al hacer clic en un equipo se abre un perfil competitivo completo.
- El perfil muestra:
  - ranking global del equipo;
  - partidos, victorias, empates y derrotas;
  - goles a favor, goles en contra y diferencia;
  - títulos y rendimiento;
  - usuarios destacados con ese equipo;
  - últimos partidos registrados;
  - futbolistas históricos por goles + asistencias;
  - goleadores del club;
  - asistidores del club;
  - palmarés reciente;
  - plantilla oficial con fotos.

## Base de datos

No requiere SQL nuevo. Usa los datos ya disponibles de torneos, partidos, goles, asistencias y rankings existentes.

## Validación

Ejecutado correctamente:

```bash
npm run qa
npm run build
```
