# MITBOL · frontend del menú digital

Proyecto integrador de Desarrollo de Sistemas Web. Página pública provisional para verificar React → FastAPI en Render → catálogo almacenado por el backend en PostgreSQL/Neon. El navegador solo consulta la API; nunca se conecta directamente a Neon.

## Estado encontrado y alcance

- React y React DOM (19.3.0 resueltos por el lockfile), TypeScript 6.0.3, Vite 8.3.0 y React Router DOM 7.18.3. No utiliza CRA ni Next.js.
- npm con `package-lock.json` v3. Dependencias de ejecución: `react`, `react-dom`, `react-router-dom`. Herramientas: TypeScript, Vite, plugin React, ESLint 10, typescript-eslint, plugins de React Hooks/Refresh, globals y tipos de React/Node. `npm ls --depth=0` muestra las versiones instaladas.
- Inicialmente solo existían `App.tsx`, `main.tsx` y carpetas con `.gitkeep`: `assets`, `components`, `context`, `pages/admin`, `pages/public`, `routes`, `services`, `utils`.
- `BrowserRouter` ya estaba activo: `/`, `/admin`, `/admin/dashboard` y `*` (404). Las rutas administrativas eran placeholders, sin autenticación ni llamadas API; se conservan tal como estaban. No constituyen un panel protegido ni funcional.
- `.env` y `.env.example` estaban vacíos. No existían cliente API, estilos, pruebas ni workflows de GitHub Actions. TypeScript y ESLint ya estaban configurados.
- Scripts originales: `dev` (Vite), `build` (`tsc -b && vite build`), `lint` (ESLint), `preview` (Vite). Se añadieron `typecheck` y `test`, sin dependencias nuevas.
- Vite no tenía `outDir` personalizado: el build comprobado genera `dist/`. La raíz del proyecto coincide con la raíz Git.
- No había versión de Node fijada. Vite exige Node 20.19+ o 22.12+; ESLint exige 20.19+, 22.13+ o 24+. Ahora `.node-version` fija **24.22.1** para Render; `engines` admite las ramas 22 desde 22.13 y 24.
- Al iniciar, el árbol estaba limpio en `develop`. `main`, `develop`, `origin/main` y `origin/develop` apuntaban a `1e8087b`. Se comprobaron las dos ramas remotas con `git ls-remote`. No se cambiaron ramas, ni se hicieron commits, push o despliegues.

## Cambios y funcionamiento

- `src/pages/public/ConnectionPage.tsx` y `connection.css`: bienvenida responsive, estado independiente del backend, catálogo de hasta seis productos, selección de detalle, carga, respuesta vacía, errores y reintentos.
- `src/components/ProductCard.tsx`: nombre, descripción o respaldo explícito, rango de precios, variantes y disponibilidad. El monograma es decorativo; no se inventan fotos. Precios y moneda proceden de la API, conservando las cadenas decimales.
- `src/services/config.ts`: única configuración de URL base mediante `VITE_API_URL`, con respaldo al backend público existente.
- `src/services/api.ts`: solicitudes JSON sin credenciales, barras normalizadas, errores HTTP, JSON inválido, red/CORS y timeout de 90 segundos. Se cancelan consultas al desmontar o cambiar producto mediante `useApi.ts`.
- `src/services/menu.ts`: tipos y validación del contrato observado en producción (`products`/`product`, `currency`, `product_id`, `product_variant_id`, precios como strings y campos nulos).
- `src/App.tsx`: sustituye únicamente la portada `/` por esta página. `index.html`: idioma español, título y descripción; elimina la referencia al favicon inexistente.
- `.env.example`, `.gitignore`, `.node-version`, `package.json` y lockfile: configuración pública, archivos locales ignorados, Node y comandos de validación. El lockfile conserva las versiones y metadatos de plataforma existentes.
- `tests/api.test.ts`: nueve pruebas con fixtures solo de pruebas; la aplicación no importa mocks ni contiene productos/precios de respaldo.

Solo se consumen `GET /`, `GET /api/menu` y, al seleccionar un producto, `GET /api/menu/{product_id}`. Esta página se puede sustituir después por las vistas del equipo. No implementa login, sesiones, pagos, pedidos ni administración.

## Uso local y variables

Instala Node **24.22.1** (o una versión admitida por `engines`) y ejecuta desde la raíz:

```powershell
npm ci
Copy-Item .env.example .env.local
npm run dev -- --port 5173 --strictPort
```

Abre **http://localhost:5173**, usando ese host y puerto exactos porque ya están permitidos por CORS. `--strictPort` evita que Vite cambie silenciosamente a un origen no autorizado.

Única variable pública de la aplicación:

```dotenv
VITE_API_URL=https://mitbol-backend.onrender.com
```

Usa la raíz del backend, sin `/api/menu`. Para apuntar a otro backend, cambia `.env.local` y reinicia Vite. Las variables `VITE_*` se incorporan al JavaScript público durante el build: no incluyas secretos, tokens ni credenciales de PostgreSQL. En Render, cambiar esta variable exige un nuevo build. Véase [variables de Vite](https://vite.dev/guide/env-and-mode).

El `.env` vacío ya estaba versionado y se dejó intacto. Usa `.env.local`, que está ignorado. `.gitignore` no deja de seguir archivos previamente versionados: al preparar el commit puedes retirar ese `.env` vacío del índice con `git rm --cached .env`, sin borrar tu copia local.

Validaciones:

```powershell
npm run typecheck
npm run lint
npm test
npm run build
```

`npm run preview` sirve el build para inspección local, normalmente en el puerto 4173. Ese origen **no** está autorizado actualmente por CORS; para probar la API en navegador usa el servidor de desarrollo en `http://localhost:5173`. Preview no es un servidor de producción.

## Resultados de verificación · 6 de noviembre de 2026

- `npm ci`: correcto, 164 paquetes, sin añadir dependencias al proyecto. El entorno tiene Node 22.12.0/npm 10.9.0 y emitió advertencias `EBADENGINE` por ESLint; actualizar Node local según `.node-version` evita esa incompatibilidad declarada. No se ha ejecutado aquí con Node 24.22.1.
- `npm run typecheck`, `npm run lint`, `npm test` (9/9) y `npm run build`: correctos. El build ejecuta también TypeScript y genera HTML, CSS y JS en `dist/`.
- Pruebas: URL sin barras duplicadas, solicitudes sin credenciales, contrato real y campos adicionales, nulos y catálogo vacío, respuestas inválidas, HTTP 404/500, JSON inválido, red/posible CORS, timeout y cancelación.
- Preview local: HTTP 200 para `/`, `/admin/dashboard`, una ruta desconocida y los assets compilados. La inspección HTTP comprueba entrega y fallback local; no ejecuta React ni sustituye una prueba en navegador.
- Backend público: `/`, `/api/menu` y `/api/menu/1` respondieron HTTP 200. Con `Origin: http://localhost:5173`, los tres devolvieron `Access-Control-Allow-Origin: http://localhost:5173`. El catálogo devolvió tres productos reales y el detalle devolvió `currency` y `product` con sus variantes.
- La primera consulta tardó unos 34 segundos. La interfaz contempla hasta 90 segundos y permite reintentar. Los fallos de red/CORS nunca muestran un catálogo simulado.
- No se verificó la página en un navegador automatizado ni el origen HTTPS futuro. Las respuestas públicas confirman acceso al catálogo a través del backend; no equivalen a una inspección directa de la conexión o configuración de Neon.

## Render Dashboard · Static Site

Cuando decidas publicar, selecciona **New → Static Site** y conecta el repositorio frontend:

| Campo | Valor |
| --- | --- |
| Name | `mitbol-frontend` (recomendado; disponibilidad por confirmar) |
| Repository | `https://github.com/Integracion-Continua-y-Entrega/mitbol-frontend` |
| Branch | `develop` |
| Root Directory | Dejar vacío: `package.json` está en la raíz Git |
| Build Command | `npm ci && npm run build` |
| Publish Directory | `dist` |
| Environment Variables | `VITE_API_URL` = `https://mitbol-backend.onrender.com` |
| Auto-Deploy | `On Commit` para que los merges a `develop` actualicen el sitio de integración |

Node se selecciona con `.node-version` (**24.22.1**); no es necesario duplicarlo en una variable. Si el servicio ya tiene `NODE_VERSION`, elimínala o iguala su valor a `24.22.1`, porque tiene precedencia. Referencias: [Node en Render](https://render.com/docs/node-version) y [despliegue estático de Vite](https://vite.dev/guide/static-deploy).

No necesitas Start Command, puerto de servidor ni Web Service para este frontend estático. El primer despliegue lo inicias tú después de revisar y subir los cambios.

En **Redirects/Rewrites**, añade esta regla para `BrowserRouter`:

| Source | Destination | Action |
| --- | --- | --- |
| `/*` | `/index.html` | `Rewrite` |

Esto permite recargar rutas como `/admin/dashboard` y dejar que React muestre su 404. No activa administración ni autenticación. Render conserva la entrega de archivos reales como JS/CSS. Véase [rewrites en Render](https://render.com/docs/redirects-rewrites).

## CORS después del primer despliegue

La URL del frontend todavía **no está confirmada**. Copia el origen HTTPS asignado por Render: esquema y host (y puerto si existiera), sin ruta ni barra final. No uses la URL de GitHub ni la del backend como origen del frontend.

Se consultaron únicamente, en lectura, `app/core/config.py` y el ejemplo público de configuración del backend local para confirmar el formato: `CORS_ORIGINS` es una **lista JSON**, no una lista separada por comas.

En el servicio **backend**, cuando tú apliques la configuración, conserva localhost y añade el origen real. Plantilla que debes sustituir antes de guardar:

```dotenv
CORS_ORIGINS=["http://localhost:5173","https://HOST-REAL-DEL-FRONTEND.onrender.com"]
```

En Render introduce `CORS_ORIGINS` como nombre y solo el array JSON como valor, sin comillas exteriores. **Solo si Render confirma exactamente** `https://mitbol-frontend.onrender.com`, el valor sería:

```json
["http://localhost:5173","https://mitbol-frontend.onrender.com"]
```

Guarda y vuelve a desplegar el backend para que recargue la variable cuando estés listo. Este trabajo no modificó el backend, Render ni Neon. Cambiar CORS solo permite la comunicación del navegador: no habilita autenticación, permisos administrativos ni migraciones.

## Revisión y Git · ejecutar tú al aprobar los cambios

Revisa los archivos nuevos además del diff; `git diff` no incluye el contenido de archivos sin seguimiento. Comprueba que no se incluyan `.env.local`, `node_modules` ni `dist`. No mezcles cambios de otros integrantes.

```powershell
git branch --show-current
git status --short
git diff
git fetch origin
git log --oneline --left-right develop...origin/develop
```

La rama actual debe ser `develop`. Si el remoto avanzó desde la revisión, integra sus cambios antes del push; no uses `--force`. Los siguientes comandos seleccionan únicamente los archivos de esta preparación:

```powershell
git rm --cached .env
git add .env.example .gitignore .node-version README.md index.html package.json package-lock.json src/App.tsx src/components/ProductCard.tsx src/pages/public/ConnectionPage.tsx src/pages/public/connection.css src/services/api.ts src/services/config.ts src/services/menu.ts src/services/useApi.ts tests/api.test.ts
git diff --cached --check
git diff --cached
git commit -m "feat: preparar verificacion publica y despliegue en Render"
git pull --rebase origin develop
npm run lint
npm test
npm run build
git push -u origin develop
```

Si aparecen conflictos, resuélvelos conservando el trabajo del equipo y repite las validaciones antes de subir. `main` queda como rama estable; los integrantes pueden partir de `develop` con `git switch -c feature/nombre-de-historia`. No se ejecutaron los comandos de commit/push anteriores.

## Comprobación después de publicar

1. Confirma que el log de Render usa la versión de Node fijada y termina con build correcto y publicación de `dist`.
2. Copia la URL HTTPS real y aplica tú el ajuste de CORS descrito arriba; después abre el frontend y pulsa «Volver a comprobar» y «Actualizar catálogo».
3. En DevTools → Network → Fetch/XHR, verifica `GET /` y `GET /api/menu` al backend, respuestas HTTP 200 y `Access-Control-Allow-Origin` igual al origen exacto del frontend. No basta con abrir la API directamente en otra pestaña.
4. Pulsa «Consultar detalle». Comprueba una nueva petición `/api/menu/{product_id}`, su JSON y la presentación del producto. Revisa nombres, precios, variantes y disponibilidad contra la respuesta recibida.
5. Si la consola muestra un bloqueo CORS, compara los orígenes literalmente y corrige la lista del backend; el código de la página no puede corregir CORS. Una petición puede aparecer con HTTP 200 y seguir bloqueada para JavaScript por falta del encabezado permitido.
6. Prueba el modo Offline de DevTools y los botones de reintento; restaura la red. La página debe mostrar errores, nunca productos simulados.
7. Revisa el ancho móvil y recarga directamente `/admin/dashboard` y una ruta desconocida. Deben cargar el placeholder conservado y la página 404 de React respectivamente, gracias al rewrite.

Pendientes reales: actualización de Node local, revisión y subida manual de cambios, creación del Static Site por el usuario, confirmación del origen HTTPS, ajuste posterior de CORS y prueba final en navegador. La autenticación y sus migraciones quedan fuera de este despliegue público.

## Equipo

- Carlos de Jesús Miranda Becerra
- Rene Emiliano Sanchez Saucedo
