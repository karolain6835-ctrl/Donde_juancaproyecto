# Donde Juanca — Frontend

Entrega de la evidencia SENA **GA7-220501096-AA4-EV03**.

## Descripción general

Donde Juanca es un sistema de información para gestionar inventario, productos, pedidos, ventas y juegos del establecimiento. El frontend presenta la interfaz administrativa y consume una API REST.

## Módulo de productos e inventario

La ruta `/inventario` reúne productos, categorías, búsqueda, filtros e indicadores de existencias. Incluye creación, edición y eliminación de productos, ajuste de stock, movimientos, alertas, mermas y refrigeradores. Las consultas y acciones disponibles dependen de la sesión y los permisos del usuario.

## Tecnologías

React 19, JavaScript y JSX, Vite 8, React Router DOM 7, CSS, Lucide React, fuentes de Fontsource y ESLint. El backend del proyecto utiliza Node.js, Express y MySQL.

## URL de la API y despliegue

Configurar `VITE_API_URL` en el servicio frontend de Railway antes del build. Admite el origen del backend (por ejemplo `https://api.example.invalid`) o ese mismo origen terminado en `/api`. El cliente central añade `/api` una sola vez, de modo que el login se envía a `/api/usuarios/login`. Los recursos de imágenes comparten esa configuración. Sin variable, desarrollo usa `http://localhost:5000/api`.

Vite incorpora las variables `VITE_*` al compilar: cambiar la variable exige reconstruir y desplegar el frontend. Estas variables son públicas y no deben contener secretos. La corrección del prefijo no modifica autenticación ni CORS; el cliente usa Bearer y no solicita cookies entre orígenes.

## Estructura del frontend

```text
frontend-app/src/
  components/  Secciones, formularios y componentes reutilizables
  pages/       Pantallas, incluida InventarioPage.jsx
  hooks/       Consultas y coordinación de operaciones remotas
  services/    Cliente HTTP, contratos y servicios REST
  context/     Autenticación compartida
  routes/      Protección de rutas y permisos
  layouts/     Estructura administrativa
  utils/       Formatos, fechas y permisos
  App.jsx      Definición de rutas
  main.jsx     Montaje de React y BrowserRouter
```

## Hooks y navegación

`useState` conserva formularios, filtros, selección y estados de carga o error. `useEffect` coordina consultas y cancela solicitudes pendientes al desmontar. En `useRemoteCatalog`, `useRef` conserva el controlador de cancelación y `useCallback` estabiliza la recarga. `useMemo` permite derivar listas filtradas.

React Router utiliza `BrowserRouter`, `Routes` y `Route`. `/` redirige a `/login`; `ProtectedRoute` protege `/inventario` mediante la sesión y el permiso `inventario.ver`.

## Comunicación con la API REST

`apiClient.js` centraliza `fetch`, la URL base, el token Bearer, los cuerpos JSON y los errores. Los servicios validan y adaptan las respuestas.

`productosService.js` consulta, crea, actualiza y elimina mediante `/productos` y `/productos/:id`. `inventarioService.js` consulta `/inventario/movimientos` y envía ajustes con `PUT /inventario/actualizar-stock`. Estas rutas se añaden a la URL base, que incluye `/api`. Después de confirmar un ajuste se recargan los datos del servidor.

## Requisitos e instalación

Se necesitan npm, un navegador moderno y Node.js compatible con Vite 8: versión 20 desde 20.19, o versión 22.12 o superior. Para las operaciones remotas también se requieren el backend activo, MySQL configurado y una cuenta con los permisos correspondientes.

Desde la raíz del repositorio:

```bash
cd frontend-app
npm install
npm run dev
```

Abre la dirección que muestre Vite. Si PowerShell bloquea `npm.ps1`, utiliza `npm.cmd install` y `npm.cmd run dev`.

## Configuración de VITE_API_URL

Crea `frontend-app/.env` con una URL de ejemplo sin credenciales:

```dotenv
VITE_API_URL=http://localhost:5000/api
```

Ejemplo para otro entorno:

```dotenv
VITE_API_URL=https://api.example.com/api
```

Sin esta variable, el cliente utiliza `http://localhost:5000/api`. Reinicia Vite después de cambiarla. En producción se incorpora durante el build. Las variables `VITE_*` son públicas en el navegador y no deben contener secretos. `.env` y sus variantes están excluidos de Git.

El frontend puede compilarse sin el backend, pero el inicio de sesión, los catálogos, los ajustes y otras operaciones con datos necesitan la API y la base de datos. El backend debe permitir el origen del frontend mediante CORS.

## Verificación

Desde `frontend-app`:

```bash
npm run lint
npm run build
npm run preview
```

`lint` analiza el código, `build` genera `dist/` y `preview` sirve esa compilación localmente. Estas comprobaciones no sustituyen las pruebas de operaciones con la API y MySQL.
