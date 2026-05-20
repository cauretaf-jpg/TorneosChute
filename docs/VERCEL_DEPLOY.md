# Publicación en Vercel

## Requisitos

- Proyecto subido a GitHub.
- Cuenta de Vercel conectada con GitHub.
- Node.js instalado localmente para probar antes de publicar.

## Pasos

1. Ejecutar localmente:

```bash
npm install --no-audit --no-fund
npm run verify
```

2. Subir cambios a GitHub:

```bash
git add .
git commit -m "Publicar Chute Plataforma 1.0"
git push
```

3. En Vercel:

- New Project.
- Importar repositorio.
- Framework: Vite.
- Build command: `npm run build`.
- Output directory: `dist`.

4. Si se conecta Supabase después, configurar variables:

```text
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

## Nota

La app puede publicarse como frontend estático, pero los datos seguirán siendo del navegador hasta conectar Supabase.
