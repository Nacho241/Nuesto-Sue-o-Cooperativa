# Guardias & Rotación — Cloudflare

Versión adaptada para Cloudflare Workers + React + D1. Mantiene la interfaz y la lógica original, pero reemplaza `window.storage` por una API `/api/storage/*` respaldada por Cloudflare D1, por lo que todos los usuarios del mismo enlace ven y editan los mismos datos.

## Crear y desplegar

1. Instala Node.js 20+ y abre una terminal dentro de esta carpeta.
2. Ejecuta `npm install`.
3. Inicia sesión: `npx wrangler login`.
4. Crea la base: `npx wrangler d1 create guardias-db`.
5. Copia el `database_id` que devuelve Cloudflare y reemplaza `PONE_AQUI_EL_DATABASE_ID` en `wrangler.jsonc`.
6. Crea la tabla remota: `npm run db:remote`.
7. Prueba localmente con `npm run dev`.
8. Publica con `npm run deploy`.

Cloudflare te dará una URL `*.workers.dev`. Después podés agregar tu dominio desde Workers & Pages > tu Worker > Settings/Domains & Routes.

## Archivos principales

- `src/App.jsx`: la aplicación original, adaptada.
- `worker/index.js`: API que guarda/lee datos en D1.
- `schema.sql`: tabla de persistencia.
- `wrangler.jsonc`: configuración de Cloudflare.
- `vite.config.js`: integración React/Vite/Cloudflare.

## Importante

No uses `window.storage`: esa API no existe en un navegador normal ni en Cloudflare. En esta versión el frontend llama a `/api/storage/...` y el Worker persiste el JSON en D1.
