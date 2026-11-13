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

El frontend consulta `GET /api/menu`, `GET /api/menu/{product_id}` y el diagnóstico `GET /`. Las consultas públicas actuales no utilizan sesión. Para futuras operaciones administrativas, el backend requiere cookies con `credentials: "include"` y protección CSRF en escrituras; el cliente público actual no implementa esas operaciones.

## Alcance de los ajustes móviles

- Cuadrículas que caben desde 320 px sin anchos mínimos que desborden la pantalla.
- Nombres, precios, variantes y complementos que pueden distribuirse en varias líneas.
- Cabecera, navegación, botones y avisos adaptados a pantallas pequeñas; áreas táctiles de al menos 44 px.
- Imágenes proporcionadas y márgenes que respetan las áreas seguras de dispositivos móviles.
- Foco y desplazamiento al abrir el detalle; al cerrarlo, regreso al botón del producto. Compatible con preferencia de movimiento reducido.
- Acceso por teclado, enlace para saltar al menú y contorno de foco visible.
- Acceso al servidor de desarrollo desde la red local y proxy de Vite para consultar productos sin configurar CORS por cada IP de prueba.

Se conserva el diseño de marca, el catálogo real, las presentaciones, los complementos, la disponibilidad y los estados de carga, vacío y error. Los JSON de diagnóstico heredados siguen disponibles.

Las rutas `/admin` y `/admin/dashboard` siguen siendo placeholders. Esta entrega no implementa el dashboard, login, carrito, filtros, pedidos, pagos, fidelización ni otras historias del Backlog. La adaptación responsive no convierte por sí sola el sitio en una PWA instalable: manifiesto, iconos e instalación quedan para una entrega posterior.

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

## Equipo

- Carlos de Jesús Miranda Becerra
- Rene Emiliano Sanchez Saucedo
