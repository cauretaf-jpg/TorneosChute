# Chute Plataforma 1.9.0 - Central del Torneo

Esta versión usa como base el ZIP `PaginaChute.zip` y agrega una capa de experiencia dentro de cada torneo.

## Cambios principales

- Nueva **Central del Campeonato** en la pestaña Resumen.
- Indicadores de líder actual, fecha actual, partidos jugados, goleador y mejor defensa.
- Panel de **Fecha actual** con progreso y estado de cada partido.
- Tarjeta de **Partido destacado** con visual tipo marcador.
- Historial breve entre los jugadores del partido destacado.
- Accesos rápidos a fixture, tabla, perfil, administración e imágenes para compartir.

## Alcance técnico

No se modificaron las reglas críticas de Supabase, cierre de torneos, generación de fixture ni cálculo de rankings. La mejora se concentra en interfaz y lectura de información ya existente.

## Cómo probar

1. Descomprimir el ZIP.
2. Entrar a la carpeta `PaginaChute`.
3. Ejecutar `iniciar-chute-plataforma.bat` o abrir PowerShell y usar:

```powershell
npm run dev
```

4. Abrir un torneo con fixture generado.
5. Revisar la pestaña **Resumen**.

## Publicación

Cuando la versión esté aprobada localmente, ejecutar:

```text
subir-chute-github.bat
```
