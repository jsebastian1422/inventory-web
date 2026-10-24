# inventory-web

Frontend PWA del sistema de inventario: Vue 3 + TypeScript + Vite, Vue Router, Pinia y
vite-plugin-pwa.

## Requisitos

Node.js 24+ y npm. Para datos reales, `inventory-api` en ejecucion.

## Variables de entorno

`cp .env.example .env`

Si `VITE_API_URL` no se define, se usa `http://localhost:3000` por defecto (ver `src/config.ts`).

| Variable       | Descripcion                                              |
| -------------- | -------------------------------------------------------- |
| `VITE_API_URL` | URL base de la API (por defecto `http://localhost:3000`) |

## Arranque desde cero

```bash
cp .env.example .env
npm install
npm run dev                       # desarrollo en http://localhost:5173
npm run build && npm run preview  # build PWA servido en http://localhost:4173
```

Al instalar puede aparecer el aviso `npm warn install-scripts` (fsevents); es informativo y no
impide el uso.

Tras `build`, `dist/` contiene `manifest.webmanifest` y el service worker `sw.js`. En `/` se ve el
layout de dashboard (barra lateral, cabecera y contenido) con la vista Home.

## Agregar un modulo

Crea la vista en `src/views/`, registra la ruta en `src/router/index.ts` y el enlace en `navItems`
de `src/layouts/DashboardLayout.vue`.

## Calidad

```bash
npm run lint
npm test
npm run build
```
