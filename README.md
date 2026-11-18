# 📱 Frontend - Menú Digital mitbol

Este repositorio contiene la capa de presentación del sistema de menú digital mediante código QR para el restaurante **mitbol**. Desarrollado como proyecto integrador para la materia de Desarrollo de Sistemas Web.

## 🚀 Tecnologías Utilizadas

- **Framework:** [React](https://reactjs.org/)
- **Build Tool:** [Vite](https://vitejs.dev/)
- **Enrutamiento:** React Router DOM
- **Estilos:**

## 📁 Estructura Principal

El proyecto está dividido en dos vistas principales:

1. **Interfaz para Clientes:** Vista de solo lectura optimizada para dispositivos móviles (escaneo de QR) donde los comensales pueden consultar categorías, platillos, promociones y precios.
2. **Interfaz de Administración:** Panel privado protegido por autenticación para que el personal autorizado gestione el contenido del menú.

## 🛠️ Instalación y Uso Local

Sigue estos pasos para correr el proyecto en tu entorno de desarrollo:

1. Clona el repositorio y entra en su carpeta:

   ```powershell
   git clone https://github.com/Integracion-Continua-y-Entrega/mitbol-frontend.git
   cd mitbol-frontend
   ```

2. Instala las dependencias:

   ```powershell
   npm install
   ```

3. Levanta el servidor de desarrollo:

   ```powershell
   npm run dev
   ```

## Alcance del proyecto

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

El menú consulta `GET /api/menu` y `GET /api/menu/{product_id}` sin sesión. El panel administrativo conserva sus solicitudes directas a Render con `credentials: "include"` y protección CSRF en escrituras. Para acceder al panel en desarrollo, utiliza `http://localhost:5173/admin`, un origen autorizado por el backend. El proxy de la red local se utiliza para el menú público; el inicio de sesión administrativo desde la IP del teléfono requiere validar CORS y cookies por separado.

## Alcance de los ajustes móviles

- Cuadrículas que caben desde 320 px sin anchos mínimos que desborden la pantalla.
- Nombres, precios, variantes y complementos que pueden distribuirse en varias líneas.
- Cabecera, navegación, botones y avisos adaptados a pantallas pequeñas; áreas táctiles de al menos 44 px.
- Imágenes proporcionadas y márgenes que respetan las áreas seguras de dispositivos móviles.
- Foco y desplazamiento al abrir el detalle; al cerrarlo, regreso al botón del producto. Compatible con preferencia de movimiento reducido.
- Acceso por teclado, enlace para saltar al menú y contorno de foco visible.
- Acceso al servidor de desarrollo desde la red local y proxy de Vite para consultar productos sin configurar CORS por cada IP de prueba.

Se conserva el diseño de marca, el catálogo real, las presentaciones, los complementos, la disponibilidad y los estados de carga, vacío y error.

Se integró `feature/fe1-panel-admin` en la rama móvil. `/admin` contiene el inicio de sesión y `/admin/dashboard` utiliza una ruta protegida. Se incluyen el catálogo administrativo, disponibilidad, descripciones, etiquetas, fotografías y QR del menú. Las etiquetas y fotografías administradas también se presentan en el menú público, que actualiza sus consultas al recibir avisos de cambios y periódicamente mientras la página está visible.

Los estilos del panel mantienen sus componentes y colores mediante `.admin-page`, sin reemplazar el diseño móvil del cliente. La integración no incorpora carrito, filtros, pedidos, pagos ni fidelización. La adaptación responsive no convierte por sí sola el sitio en una PWA instalable: manifiesto, iconos e instalación quedan para una entrega posterior.

Integración verificada el 13 de noviembre de 2026: build correcto, 12/12 pruebas y revisión del catálogo con etiquetas, actualización sin ocultar los productos, formulario de acceso administrativo y redirección de `/admin/dashboard` al login sin sesión. No se probaron escrituras ni un inicio de sesión con credenciales reales.

## Comandos y comprobaciones

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
5. Comprueba el menú, un detalle, Mi lealtad y la recarga directa de `/admin`. El inicio de sesión y las escrituras administrativas requieren verificar además las cookies y CSRF desde el nuevo dominio.

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
