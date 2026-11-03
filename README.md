# inventory-web

Frontend PWA del sistema de inventario: Vue 3 + TypeScript + Vite, Vue Router, Pinia y
vite-plugin-pwa.

## Requisitos

Node.js 24+ y npm. Para datos reales, `inventory-api` en ejecucion.

## Variables de entorno

`cp .env.example .env`

Si no se definen, se usan los valores por defecto (ver `src/config.ts`).

| Variable            | Descripcion                                                                                 |
| ------------------- | ------------------------------------------------------------------------------------------- |
| `VITE_API_URL`      | URL base de la API de negocio, core (por defecto `http://localhost:3000`)                   |
| `VITE_IDENTITY_URL` | URL base del servicio identity: sesion y recuperacion (por defecto `http://localhost:3001`) |

identity y esta app deben estar en el **mismo sitio** (mismo dominio registrable): la cookie de sesion es
`SameSite=Strict`. `localhost:5173` y `localhost:3001` lo cumplen. El origen de esta app debe estar en
`CORS_ORIGINS` de identity y de core (ver `inventory-api/README.md`).

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

## Inicio de sesion y recuperacion (sprint 011)

Rutas publicas (layout `AuthLayout`, fondo compartido que no se vuelve a montar al navegar entre ellas):

| Ruta           | Vista                | Panel                    |
| -------------- | -------------------- | ------------------------ |
| `/ingresar`    | `LoginView`          | a la derecha (>= 1024px) |
| `/recuperar`   | `ForgotPasswordView` | centrado                 |
| `/restablecer` | `ResetPasswordView`  | centrado (`#token=...`)  |

No hay registro: solo entran usuarios creados por un administrador. El resto de las rutas son privadas.

- **Rutas:** cada ruta declara `meta.public`, `meta.layout` (`auth` | `dashboard`) y, en las publicas,
  `meta.panel` (`side` | `center`). El middleware es `router.beforeEach` (`src/router/guards.ts`): espera a
  que la sesion se intente restaurar, manda a `/ingresar?redirect=<ruta>` si no hay sesion y, con sesion, saca
  de las rutas publicas hacia el destino pedido o `/`. `App.vue` muestra una pantalla de carga mientras la
  sesion esta `unknown` y aplica las mismas reglas cuando la sesion cambia fuera de una navegacion.
- **Sesion (ADR-0007):** `src/stores/session.ts`. El access token vive **solo en memoria**; el refresh token
  viaja en una cookie `HttpOnly` que JavaScript no ve (nada en `localStorage`/`sessionStorage`). Se renueva 60 s
  antes de vencer. `BroadcastChannel('inv-session')` cierra o abre la sesion en todas las pestanas y
  `navigator.locks` serializa la renovacion entre pestanas.
- **Cliente HTTP:** `src/api/http.ts` (`fetch` con `Bearer`; `credentials: 'include'` solo hacia `/auth/*`). Ante
  un 401 renueva **una sola vez** para todas las peticiones en curso y reintenta; si falla, vuelve al login con
  "Tu sesion expiro". `src/api/auth.ts` agrupa login, refresh, logout, me y recuperacion.
- **Diseno:** variables CSS (paleta verde petroleo + acento ambar sobre neutros calidos, radios, sombras) al
  inicio de `src/style.css`, con los contrastes AA documentados; tipografia del sistema; logotipo en
  `src/components/BrandLogo.vue`; ilustracion de fondo propia en `src/assets/auth-bg.svg` (reemplazable: cambia
  el archivo o la `url()` de `AuthLayout.vue`; el color de respaldo es `--color-primary-dark`). Breakpoints:
  < 768px tarjeta a ancho completo; >= 1024px panel lateral/centrado. Respeta `prefers-reduced-motion`.
- **PWA:** el service worker no cachea `/auth/*` (`NetworkOnly` + `navigateFallbackDenylist` en `vite.config.ts`).
- **Despliegue:** sirve la app con una CSP restrictiva (ejemplo en `inventory-api/README.md`).

## Menu de modulos (sprint 012)

`/` muestra en cards los modulos a los que el usuario tiene acceso. El catalogo fijo esta en
`src/modules/catalog.ts` (`MODULES`: `id`, `title`, `description` de maximo 90 caracteres, `icon`, `path`,
`anyOf` y `order`); `useModules()` lo filtra con `session.permissions` (basta con tener alguno de `anyOf`) y lo
usan `HomeView` y la barra lateral (`DashboardLayout`). Mientras la sesion no esta lista se ven esqueletos.

- **Cards por fila:** el control "Cards por fila" (2 a 5, 4 por defecto) guarda la eleccion en `localStorage`
  (clave `inv.pref.menuColumns`) desde `src/preferences/menu-columns.ts`, el **unico** archivo que puede usar
  `localStorage` (lo verifica la prueba CA-15 de `session.test.ts`). La lectura es estricta: solo acepta un entero
  de 2 a 5 (`/^[2-5]$/`); cualquier otro valor ("3abc", "3.9", " 3", "03") o un almacenamiento que falla dan 4.
- **Columnas por ancho del contenedor:** `.home` es un contenedor (`container-type: inline-size`) y las columnas
  dependen de su ancho, no del de la ventana (la barra lateral abierta resta espacio): menos de 440 px, 1 columna;
  de 440 a 879 px, 2; de 880 a 1079 px, `min(preferida, 4)`; desde 1080 px, la preferida (hasta 5). El control
  "Cards por fila" solo se ve desde 880 px de contenedor. Los umbrales viven en `src/style.css`.
- **Teclado del control:** un solo `tabindex=0` (el boton seleccionado); flechas Izquierda/Arriba y Derecha/Abajo
  retroceden y avanzan con vuelta circular, Home elige 2 y End elige 5; el foco sigue a la eleccion.
- **Barra lateral:** `src/stores/app.ts` la inicia cerrada si la ventana mide menos de 768 px
  (`matchMedia('(max-width: 767px)')`); en pantallas mayores inicia abierta.
- **Rutas de modulo:** `/users`, `/roles`, `/establishments`, `/categories`, `/products`, `/inventories`,
  `/stock`, `/carts` y `/sales` se generan del catalogo con `meta.permission`. `resolveAccess` redirige a `/` si
  la sesion no tiene ninguno de esos permisos; con permiso se muestra `ModulePlaceholderView` ("En construccion").
- **Agregar un modulo:** agrega su entrada a `MODULES` (con su SVG en `src/modules/icons/`) y, cuando exista su
  vista, cambia el `component` de su ruta en `src/router/index.ts`. Los codigos de `anyOf` deben coincidir con
  `inventory-api/packages/shared/src/auth/permissions.ts`: si un permiso cambia de nombre, la card desaparece.

## Calidad

```bash
npm run lint
npm test
npm run build
```
