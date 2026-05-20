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
