# MITBOL frontend

Menú digital público de MITBOL desarrollado con React, TypeScript y Vite. Permite consultar productos, disponibilidad, precios, presentaciones y complementos desde el navegador.

La rama `feature/fe2-menu-movil` incorpora la adaptación a dispositivos móviles del menú y los detalles de productos (HU-001 y HU-003), sobre el trabajo de `feature/fe1-menu-y-detalles` (`217df1c`). También configura el acceso desde teléfonos en la red local para probar la integración con el backend de Render.

## Ejecutar en local

Usa una versión de Node admitida por `package.json` (22.13+ de la rama 22, o 24).

```powershell
npm ci
Copy-Item .env.example .env.local
npm run dev
```

Abre http://localhost:5173. El backend compartido está en Render; no se necesita instalar FastAPI ni PostgreSQL.

```dotenv
VITE_API_BASE_URL=https://mitbol-backend.onrender.com
```

Se mantiene `VITE_API_URL` como alternativa para instalaciones anteriores. Si ambas están definidas, tiene prioridad `VITE_API_BASE_URL`. Reinicia Vite al cambiar variables. Las variables `VITE_*` son públicas; no contienen contraseñas ni secretos.

### Probar desde un teléfono

Conecta el teléfono y la computadora a la misma red Wi-Fi y ejecuta `npm run dev`. Abre desde el teléfono la dirección `Network` que imprime Vite, por ejemplo `http://192.168.1.25:5173`. Si no aparece, ejecuta `ipconfig` y utiliza la dirección IPv4 del adaptador conectado. Mantén abierta la terminal. Si Windows solicita acceso de Node.js a la red, permite el acceso en tu red privada.

`vite.config.ts` habilita la red local en el puerto 5173 y configura un proxy `/backend`. En desarrollo, el cliente consulta el mismo origen desde el que abriste la página: `/backend/api/menu` se reenvía al backend como `/api/menu`, y `/backend/` al diagnóstico `/`. Así, el navegador del teléfono no realiza consultas entre orígenes y no necesitas agregar la IP local a CORS para estas consultas públicas. Mantén `VITE_API_BASE_URL` apuntando a Render.

El proxy solo existe con el servidor de desarrollo. El build de producción consulta directamente la URL configurada y requiere que el backend permita el origen publicado. La autenticación y las escrituras administrativas requieren una validación independiente de cookies y CSRF.

El menú consulta `GET /api/menu`, `GET /api/menu/{product_id}` y el diagnóstico `GET /` sin sesión. El panel administrativo conserva sus solicitudes directas a Render con `credentials: "include"` y protección CSRF en escrituras. Para acceder al panel en desarrollo, utiliza `http://localhost:5173/admin`, un origen autorizado por el backend. El proxy de la red local se utiliza para el menú público; el inicio de sesión administrativo desde la IP del teléfono requiere validar CORS y cookies por separado.

## Alcance de los ajustes móviles

- Cuadrículas que caben desde 320 px sin anchos mínimos que desborden la pantalla.
- Nombres, precios, variantes y complementos que pueden distribuirse en varias líneas.
- Cabecera, navegación, botones y avisos adaptados a pantallas pequeñas; áreas táctiles de al menos 44 px.
- Imágenes proporcionadas y márgenes que respetan las áreas seguras de dispositivos móviles.
- Foco y desplazamiento al abrir el detalle; al cerrarlo, regreso al botón del producto. Compatible con preferencia de movimiento reducido.
- Acceso por teclado, enlace para saltar al menú y contorno de foco visible.
- Acceso al servidor de desarrollo desde la red local y proxy de Vite para consultar productos sin configurar CORS por cada IP de prueba.

Se conserva el diseño de marca, el catálogo real, las presentaciones, los complementos, la disponibilidad y los estados de carga, vacío y error. Los JSON de diagnóstico heredados siguen disponibles.

Se integró `feature/fe1-panel-admin` en la rama móvil. `/admin` contiene el inicio de sesión y `/admin/dashboard` utiliza una ruta protegida. Se incluyen el catálogo administrativo, disponibilidad, descripciones, etiquetas, fotografías y QR del menú. Las etiquetas y fotografías administradas también se presentan en el menú público, que actualiza sus consultas al recibir avisos de cambios y periódicamente mientras la página está visible.

Los estilos del panel mantienen sus componentes y colores mediante `.admin-page`, sin reemplazar el diseño móvil del cliente. La integración no incorpora carrito, filtros, pedidos, pagos ni fidelización. La adaptación responsive no convierte por sí sola el sitio en una PWA instalable: manifiesto, iconos e instalación quedan para una entrega posterior.

Integración verificada el 13 de noviembre de 2026: build correcto, 12/12 pruebas y revisión del catálogo con etiquetas, actualización sin ocultar los productos, formulario de acceso administrativo y redirección de `/admin/dashboard` al login sin sesión. No se probaron escrituras ni un inicio de sesión con credenciales reales.

## Verificación

### Diseño basado en el prototipo móvil

El menú y el detalle siguen la composición de las pantallas móviles en español de `Prototipo - Mitbol.pdf`: cabecera blanca con la marca, fondo claro, acentos oliva y naranja, tarjetas redondeadas y navegación inferior. El logotipo de `public/mitbol-logo.png` se extrajo del prototipo proporcionado.

La portada presenta el catálogo real en una franja horizontal «Nuestra carta» y en una lista compacta con miniatura, descripción, precio y disponibilidad. Esta franja permite explorar todos los productos; no implementa ni simula la historia de destacados. Al abrir un producto se muestra una vista independiente con imagen grande, ficha blanca, presentaciones y opciones adicionales. Las fotografías ausentes conservan un respaldo explícito.

Se verificó el nuevo menú a 320, 390, 440, 768 y 1280 px sin desbordamiento horizontal del documento. Se comprobó el cambio de presentación de la limonada a 500 ml (49.00 MXN), el regreso del foco al producto al cerrar el detalle y el diagnóstico de conexión en línea con su respuesta JSON. La consola del navegador no registró errores durante esta comprobación.

Se mantiene temporalmente «Conexión» en la navegación móvil y de escritorio para la revisión: estado HTTP, consulta de la API, reintento y JSON de diagnóstico. También se conserva el JSON del detalle. No se copiaron del prototipo precios, fotografías de otros productos, declaraciones de IVA, nutrición, alérgenos específicos, categorías ni funciones de fidelización que la API o el alcance actual no respaldan.

### Comandos y comprobaciones

```powershell
npm test
npm run typecheck
npm run build
```

Para revisar la interfaz en DevTools:

1. Usa anchos de 320, 375, 390, 480, 768 y 1280 px, además de orientación horizontal.
2. Comprueba que el documento no se desplaza horizontalmente y que nombres, precios y estados se leen completos.
3. Abre un detalle, cambia de presentación y ciérralo: el foco debe regresar al botón del producto.
4. Consulta productos sin fotografía, agotados, con varias variantes y con complementos si existen en el catálogo compartido.
5. Comprueba carga, vacío y error con datos controlados o las herramientas de red, sin modificar la base compartida.
6. Revisa navegación por teclado, zoom al 200 % y la preferencia de movimiento reducido.

El primer arranque del backend puede tardar; el cliente conserva un timeout de 90 segundos y permite reintentar. Un error de red o CORS no se sustituye por productos ficticios.

### Resultado de esta revisión — 12 de noviembre de 2026

`npm test`: 9/9 pruebas correctas. `npm run build`: TypeScript y compilación de producción correctos.

Se revisó el catálogo real y el detalle en navegador a 320, 375, 390, 480, 667, 768 y 1280 px, sin desbordamiento horizontal del documento. Se inspeccionaron visualmente el catálogo a 390 px y el detalle a 320 px. Los botones y enlaces de navegación medidos tienen al menos 44 px de alto. La consulta de Limonada natural permitió cambiar de 355 ml a 500 ml, mostrar el precio de 49.00 MXN de esta última presentación y volver al botón original al cerrar el detalle.

Se verificó el proxy local consultando el catálogo (3 productos), un detalle y el diagnóstico del backend (HTTP 200). También se confirmó manualmente el funcionamiento desde un teléfono conectado a la red local. Queda pendiente la revisión específica en Safari/iOS y Chrome/Android; no se registró el navegador de la prueba manual.

Los estados vacío y error están cubiertos por las pruebas existentes del cliente y el contrato, pero no se forzaron visualmente en esta revisión. No se modificó la base de datos compartida.

## Despliegue

El build estático se genera en `dist/`. El host debe servir `/index.html` como fallback para las rutas de React Router. Configura `VITE_API_BASE_URL` antes del build y autoriza el origen HTTPS del frontend en CORS del backend. El proxy de desarrollo no forma parte del build estático. El despliegue se coordina con el equipo.

### CI con GitHub Actions

`.github/workflows/ci.yml` ejecuta el check **Pruebas y compilación** al abrir o actualizar un PR hacia `develop`, y en cada push a `develop`. Instala las dependencias con `npm ci`, ejecuta las pruebas y compila con `npm run build`, que también comprueba TypeScript. Utiliza Node **24.22.1**, según `.node-version`, y caché de npm. Las pruebas usan fixtures locales, sin modificar la base compartida ni requerir credenciales.

El flujo de trabajo es: rama de trabajo → PR a `develop` → checks aprobados → revisión y merge → checks del nuevo commit en `develop` → despliegue automático en Render. Un PR por sí solo no publica la rama de trabajo. Después del primer check, un administrador del repositorio puede configurar una regla para `develop` que exija PR y el check **Pruebas y compilación** antes de fusionar; añadir el YAML no activa esa regla por sí solo.

### Primera conexión con Render

`render.yaml` define el sitio estático y su despliegue desde `develop`. Para activarlo una sola vez:

1. Fusiona el PR cuando sus checks estén aprobados.
2. En Render, selecciona **New → Blueprint**, conecta este repositorio mediante la integración de GitHub y elige la rama `develop`. Usa `render.yaml` y revisa el servicio antes de crearlo. No crees un segundo servicio si el frontend ya existe: configura el existente con los valores de la tabla.
3. La configuración utiliza **After CI Checks Pass** (`autoDeployTrigger: checksPass`): los siguientes cambios de `develop` se despliegan únicamente después de que sus checks pasen. No se requieren deploy hooks ni secretos de Render en GitHub Actions.
4. Copia el origen HTTPS real que asigne Render y pide al responsable del backend que lo añada a los orígenes CORS, conservando localhost y los demás orígenes válidos. No uses una URL supuesta.
5. Comprueba el menú, un detalle, Conexión y la recarga directa de `/admin`. El inicio de sesión y las escrituras administrativas requieren verificar además las cookies y CSRF desde el nuevo dominio.

| Configuración | Valor |
| --- | --- |
| Tipo | Static Site |
| Rama | `develop` |
| Root Directory | Vacío, raíz del repositorio |
| Build Command | `npm ci && npm run build` |
| Publish Directory | `dist` |
| Variable de entorno | `VITE_API_BASE_URL=https://mitbol-backend.onrender.com` |
| Auto-Deploy | After CI Checks Pass |
| Rewrite | `/*` → `/index.html` |

Render toma la versión de Node de `.node-version`. Si el servicio existente define `NODE_VERSION`, debe coincidir con ese archivo o retirarse para evitar que lo sobrescriba. No se utiliza `npm run dev`, `npm run preview` ni un Start Command para servir el sitio estático en producción.

La conexión inicial del servicio y la configuración de CORS son pasos externos al repositorio. Los archivos anteriores preparan CI/CD; el despliegue queda operativo cuando el servicio de Render esté conectado y se confirme su URL.

Referencias: [GitHub Actions para Node.js](https://docs.github.com/en/actions/tutorials/build-and-test-code/nodejs), [Blueprints de Render](https://render.com/docs/blueprint-spec), [desplegar después de CI](https://render.com/docs/deploys#integrating-with-ci) y [versión de Node en Render](https://render.com/docs/node-version).

## Equipo

- Carlos de Jesús Miranda Becerra
- Rene Emiliano Sanchez Saucedo

---

# Menú Digital y Panel Administrativo (Frontend - Computadora)


## 1. Alcance y Módulos Implementados

El desarrollo del frontend se dividió en dos bloques funcionales alineados con las Historias de Usuario del Sprint Backlog y los contratos OpenAPI del backend en FastAPI:

### Módulo Público  (`feature/fe1-menu-y-detalles`)
* **HU-001 · Visualización completa del menú público:**
  * **Qué se hizo:** Se eliminó el límite de paginación estática (`.slice(0, 6)`) para mostrar la totalidad de los platillos activos, calculando dinámicamente el precio representativo con la regla `«Desde $X MXN»` cuando un platillo tiene múltiples variantes con distinto precio, o mostrando el precio único cuando todas las presentaciones cuestan lo mismo.
  * **Por qué:** Los comensales necesitan conocer todo el catálogo disponible y anticipar el costo mínimo real de un platillo antes de abrir su vista de detalle, manteniendo intacta la precisión decimal enviada por PostgreSQL.
* **HU-003 · Consulta de detalle por variante, modificadores y complementos:**
  * **Qué se hizo:** Se construyó el componente interactivo `ProductDetailContent` que permite alternar entre las presentaciones (`variants`) de un producto, actualizando al instante su fotografía específica, etiquetas y lista de grupos de modificadores (`MenuModifier`) con sus respectivos complementos (`MenuComplement`) y costos adicionales.
  * **Por qué:** En el modelo de datos sincronizado con Loyverse, las fotografías, etiquetas y grupos de modificadores pertenecen a cada variante individual y no solo al producto general; esta vista evita confusiones al personalizar un platillo.
* **HU-007 (Vista Pública) · Identificación visual de productos y variantes agotadas:**
  * **Qué se hizo:** Se incorporaron distintivos visuales (`Agotado` / `Disponible`) y estilos diferenciados tanto en las tarjetas generales (`ProductCard`) como en los selectores de variantes cuando `is_available` o `can_order` son `false`.
  * **Por qué:** Permite que el cliente siga conociendo la oferta gastronómica del restaurante pero identifique de inmediato qué platillos o presentaciones no pueden solicitarse temporalmente en cocina.
* **Sistema de Diseño e Identidad Visual (`mitbol · Cocina Saludable`):**
  * **Qué se hizo:** Se integró la tipografía **Plus Jakarta Sans**[cite: 1], la paleta de colores oficial (`Primary #627D32`, `Secondary #F97316`, `Tertiary #A3E635`, `Neutral #1E293B`)[cite: 1], las variantes de botones del UI Kit[cite: 1] y el isotipo vectorial (SVG) de la rodaja de naranja con hojas como imagen de respaldo automática (`fallback`)[cite: 1].
  * **Por qué:** Garantiza consistencia visual con la marca sin depender de recursos externos pesados y asegura que ningún producto sin fotografía rompa la maquetación del menú.

---

### Módulo Administrativo y Operativo (`feature/fe2-panel-admin`)
* **Seguridad, Autenticación por Cookies y Protección CSRF (`adminApi.ts`, `AuthProvider.tsx`, `ProtectedRoute.tsx`):**
  * **Qué se hizo:** Se implementó el flujo de sesión contra `/api/auth/login`, `/api/auth/me`, `/api/auth/csrf` y `/api/auth/logout` utilizando `credentials: 'include'`, enviando la cabecera `X-CSRF-Protection: 1` durante el inicio de sesión y adjuntando automáticamente el token `X-CSRF-Token` en todas las peticiones de escritura (`POST`, `PUT`, `PATCH`, `DELETE`).
  * **Por qué:** El backend protege las rutas administrativas mediante cookies HTTP-only y validación CSRF de doble envío; encapsular esta lógica en `adminFetch` centraliza el manejo de errores HTTP y evita fugas de tokens.
* **HU-008 · Consulta administrativa del catálogo sincronizado:**
  * **Qué se hizo:** Se desarrolló el inspector administrativo (`CatalogSyncedSection` y `SyncedProductInspector`) que lista todos los productos recibidos de Loyverse, diferenciando su estado comercial (`is_active`) de su disponibilidad operativa local (`is_available`), junto con el desglose de variantes y modificadores.
  * **Por qué:** Permite al administrador auditar que la sincronización con el punto de venta (Loyverse) refleje los precios y estructuras correctas antes de enriquecer el menú.
* **HU-007 (Panel Operativo) · Gestión inmediata de disponibilidad local:**
  * **Qué se hizo:** Se creó la pestaña de control rápido (`AvailabilitySection`) conectada a `PATCH /api/admin/products/{id}/availability` y `PATCH /api/admin/variants/{id}/availability`.
  * **Por qué:** El personal de cocina o barra necesita marcar un platillo o presentación como agotado en un solo clic durante el servicio sin alterar el catálogo comercial ni el inventario maestro en Loyverse.
* **HU-005 · Enriquecimiento local de productos (Descripciones, Fotografías y Etiquetas):**
  * **Qué se hizo:** Se implementó el módulo `EnrichProductsSection` para editar la descripción local del producto (`PATCH /api/admin/products/{id}/description`), crear y asignar etiquetas dietéticas o comerciales por variante (`PUT/DELETE /api/admin/variants/{id}/tags/{tag_id}`), y subir o reordenar fotografías por variante (`POST/PATCH/DELETE /api/admin/variants/{id}/images`) validando en el cliente formatos **JPG, PNG y WebP** con un peso máximo de **5 MB** y vista previa instantánea.
  * **Por qué:** Loyverse POS no almacena descripciones gastronómicas detalladas, galerías múltiples ni etiquetas saludables; este módulo enriquece la experiencia del comensal almacenando esos metadatos en PostgreSQL sin que se sobrescriban al sincronizar precios.
* **HU-004 · Generador de Código QR general del menú (`qr.ts`, `QrGeneratorSection`):**
  * **Qué se hizo:** Se implementó un generador matricial QR bajo el estándar **ISO/IEC 18004** en TypeScript puro (con corrección de errores Reed-Solomon en $GF(2^8)$), conectado a `GET /api/menu/config`, con renderizado vectorial SVG, exportación directa a imagen **PNG** mediante HTML5 Canvas y hoja de impresión dedicada (`@media print`).
  * **Por qué:** Cumple el requerimiento de negocio de ofrecer un código QR único para el restaurante listo para descargar o imprimir, **sin agregar dependencias externas** que modificaran `package-lock.json`.

---

## 2. Decisiones Técnicas y Correcciones Clave de UX/Arquitectura

Durante las pruebas de integración se resolvieron cuatro retos técnicos importantes que vale la pena destacar al explicar el proyecto:

1. **Sincronización en tiempo real entre el Panel Admin y el Menú del Cliente (`BroadcastChannel` + `localStorage` + `Visibility API`):**
   * *Problema:* Al agotar un platillo o cambiar una descripción/etiqueta en el panel administrativo, el cliente debía recargar manualmente el navegador para ver el cambio.
   * *Solución:* Cada mutación exitosa hacia `/api/admin/*` emite un evento a través de `BroadcastChannel('mitbol_menu_sync')` y actualiza una marca de tiempo en `localStorage`. La vista pública escucha ambos canales, además del evento `visibilitychange` y un refresco silencioso cada 10 segundos, actualizando el menú instantáneamente sin intervención del usuario.
2. **Persistencia de estado en formularios administrativos sin recargas disruptivas (`cachedMenu`):**
   * *Problema:* Al guardar un cambio en la pestaña de enriquecimiento (`HU-005`), la recarga del catálogo global pasaba por el estado `loading`, lo que desmontaba el formulario y obligaba al administrador a volver a seleccionar el producto y la variante desde cero.
   * *Solución:* Se implementó una capa de retención de datos (`cachedMenu` y `cachedDetail`) que mantiene montada la interfaz actual mientras la petición de actualización ocurre en segundo plano, conservando intactos el producto y la variante seleccionados.
3. **Compatibilidad estricta con el Runner Nativo de Pruebas de Node.js (`--experimental-strip-types`):**
   * *Problema:* La suite `tests/api.test.ts` se ejecuta directamente en Node 22 sin pasar por el empaquetador de Vite, por lo que cualquier importación sin extensión `.ts` dentro de la cadena de `src/services/menu.ts` rompía la ejecución de `npm test`.
   * *Solución:* Se aislaron las utilidades puras y el resolvedor de rutas multimedia (`resolveMediaUrl`) dentro de `menu.ts` manteniendo únicamente importaciones explícitas compatibles con ESM nativo de Node, logrando que las **9 pruebas unitarias** pasen sin modificar los archivos base restringidos.
4. **Cumplimiento de reglas de renderizado de React 19 (`react-hooks/set-state-in-effect`):**
   * *Problema:* El linter de React 19 rechaza llamadas síncronas a `setState` dentro de `useEffect` para prevenir renderizados en cascada.
   * *Solución:* Se reemplazaron los estados sincronizados manualmente por valores derivados con `useMemo` (`activeVariantId`, `qrMatrix`) y se trasladaron las transiciones de estado exclusivamente a manejadores de eventos (`onChange`, `onSubmit`) y callbacks de promesas asíncronas.

---

