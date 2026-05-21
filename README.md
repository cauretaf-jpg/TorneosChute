# Chute Plataforma

Aplicación web para crear torneos de Chute, invitar jugadores, elegir equipos, registrar resultados, cargar goleadores/asistidores y revisar rankings históricos.

## Ejecutar localmente

```bash
npm install --no-audit --no-fund
npm run dev
```

Luego abre el enlace que muestre la terminal, normalmente `http://localhost:5173/`.

## Validar el proyecto

```bash
npm run verify
```

Este comando ejecuta una revisión de estructura/assets y luego compila la app.

## Publicar

Revisa `docs/VERCEL_DEPLOY.md`.

## Preparación Supabase

La carpeta `supabase/` incluye esquema, políticas, equipos oficiales, plantillas y vistas de ranking para una migración posterior.

Regla definida: cada usuario solo debe ver torneos creados por él, torneos donde participa, torneos donde fue invitado o torneos donde solicitó acceso. Los rankings globales pueden usar datos agregados sin exponer salas privadas.


## Actualización 1.7

Antes de usar playoffs en Supabase, ejecuta `supabase/16_playoffs_1_7.sql`. La eliminación directa requiere 2, 4, 8 o 16 participantes. Si un partido de playoff termina empatado, debes elegir ganador por penales; esos penales no cuentan como goles normales.


### 1.8.2 · Perfiles de usuario
- Agrega perfiles competitivos de usuario desde Ranking y Perfil.
- Muestra rendimiento, palmarés, equipos usados, rivales frecuentes, últimos partidos, futbolistas destacados y logros.
- No requiere SQL nuevo.
