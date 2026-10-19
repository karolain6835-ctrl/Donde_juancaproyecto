# Cierre técnico V1: regresión funcional y E2E

Validación del 16 de octubre de 2026 (America/Bogota). No se modificaron reglas de negocio, interfaces ni servicios de producción en este bloque.

## Entorno y aislamiento

- Windows, Node.js 24.18.0, MariaDB 10.4.32, Playwright 1.64.1 y Chromium 156.
- MariaDB 10.4.32 fue probado; MySQL 8 **no está certificado**.
- `e2e/run.cjs` crea un esquema `dj_v1_e2e_<UUID>`, instala el baseline V1 validado por el manifiesto y carga fixtures identificados como E2E. Inicia Express y Vite en puertos locales libres y elimina únicamente ese esquema al terminar, incluso si las pruebas fallan.
- `e2e/backend-regression.cjs` crea otro esquema `dj_v1_regression_<UUID>`, habilita todas las banderas SQL optativas encontradas en las pruebas y ejecuta la suite secuencialmente. Las suites existentes usan tablas temporales o sus propios esquemas desechables. El esquema principal de esta ejecución también se elimina en `finally`.
- La configuración de conexión se lee de `backend/.env`; no se modifica ese archivo ni se selecciona su base habitual. Se requieren permisos para crear/eliminar bases temporales. Contraseñas E2E y secreto JWT se generan criptográficamente en cada ejecución; no se publican en el repositorio.
- No se tocaron `.postman/`, `postman/`, `entregas-sena/` ni `mobile/`. No se guardan trazas, vídeos ni capturas que puedan contener credenciales.

## Cobertura y flujos

| Área | Verificación |
| --- | --- |
| Autenticación y perfil | HTTP real: login válido/inválido, JWT, restricciones por rol, lectura/edición propia, contraseña nueva funciona y anterior falla. Suite SQL existente y matriz de roles. |
| Productos e inventario | Suites existentes de alta/edición, CPP protegido, stock, mermas, alertas y refrigeradores; lecturas reales y pestañas en Chromium. |
| Clientes y proveedores | Suites existentes de CRUD e historiales; lecturas HTTP y navegación real. |
| Compras | Suites existentes de recepción, costos, concurrencia, rollback, filtros e historial; pantalla y proveedor reales en Chromium. |
| Mesas, pedidos y Kanban | E2E completo: login, búsqueda de mesas, creación de pedido, agregar producto, recargar, cancelar y comprobar persistencia/stock por API. Suites existentes de ocupación, traslado, consolidación y estados. |
| Rondas | API real: confirmar ronda, reintento idempotente conserva ID y descuenta una sola vez; cancelación reintegra stock. Suites existentes de visitas, identidad y concurrencia. |
| Juegos | API real: mantenimiento impide inicio, volver a disponible permite iniciar, sesión activa impide mantenimiento, finalizar persiste cierre; no crea pedido_item ni modifica stock. Pestañas e historial accesibles. |
| Pagos y divisiones | API real: pago directo/verificación no modifican stock; división vacía o ajena permite pago directo; cuotas propias activas lo bloquean; pago por división funciona. Suites existentes de saldos, parciales, liquidación e idempotencia. |
| Comprobantes y cierres | Suites existentes de generación/consulta, condiciones, permisos, pagos incluidos, diferencia de efectivo, concurrencia y rollback. Lectura de cierres por API. No se afirma cobertura completa de impresión física por navegador. |
| Administración | Lecturas HTTP de usuarios, configuración y auditoría; suites existentes de persistencia, auditoría y permisos. |
| Dashboard y reportes | Navegación real en Chromium sin excepciones JavaScript ni respuestas API 5xx; pruebas frontend existentes de servicios, datos y estados remotos. |
| Cabecera global | Búsqueda real de Mesas y Auditoría sin tildes; campana muestra alerta persistida y navega a Alertas. |
| COP | Chromium verifica `2844.44` como `$2.844,44`, tolerando únicamente el espacio localizado después de `$`. Se conserva el valor decimal real en la API. Parser y formato cubiertos por la suite frontend. |

La E2E mínima no sustituye todas las suites de integración ni automatiza todas las escrituras desde la UI. El recorrido de pantallas comprueba carga, pestañas seleccionadas y navegación; no demuestra cada botón de cada rol por navegador.

## Hallazgos y correcciones

No se detectó un bug de negocio que requiriera cambios en producción. La regresión ampliada sí detectó mantenimiento pendiente en pruebas SQL antiguas:

- Cargadores VM de Auditoría y matriz de roles no incluían el middleware global de errores incorporado recientemente.
- Cargadores VM de autenticación y Clientes no resolvían `historialClientesService` desde su ubicación real.
- Una expectativa de compras seguía esperando listado vacío para proveedor inexistente; el contrato actual valida existencia y devuelve 404. Se revisó el controlador y se añadió una aserción explícita para ese caso, conservando los demás filtros.
- La prueba de permisos de pagos cargaba el router real y dejaba abierta la conexión. Se añadió cierre al finalizar.
- La prueba de fallo SQL de autenticación esperaba el mensaje previo al endurecimiento global. Ahora exige exactamente `Error interno del servidor.` y comprueba que no se filtre el error técnico inyectado.
- El arnés E2E inicial usaba `email/password` en vez de `correo/contrasena` y no contemplaba el espacio monetario de Intl. Se corrigieron las peticiones y selectores, conservando los importes esperados.

Una ejecución diagnóstica con `--test-force-exit` provocó una aserción de libuv en Windows; esa opción se retiró. El ejecutor final usa cierre explícito de conexión y un límite de 60 segundos por prueba.

## Revisión estática de residuos

Se buscaron `mock`, `mocked`, `simulado`, `dummy`, `fake`, `TODO`, `PED-999`, `codigo_simulado` y `Math.random` en fuentes, contrastando con pruebas/documentación.

- `fake-chart` es únicamente el nombre histórico de una clase CSS del Dashboard; las barras usan datos reales de `ventasSemana.dias`. No es un generador de cifras ficticias.
- Coincidencias de «todo» corresponden a texto natural o acciones reales como «Despachar todo», «Recibir todo» y «Una persona paga todo», no a TODO pendientes.
- Fixtures, dobles de prueba, referencias a endpoints retirados y documentación histórica se conservan como evidencia; no son funcionalidades publicadas.
- No se encontró `PED-999`, `codigo_simulado` ni `Math.random` operativo en `backend/src` o `frontend-app/src`.
- «No disponible» en responsable de reportes de juegos informa un dato no suministrado por el contrato; no inventa una identidad.
- No se identificaron enlaces `href="#"`, handlers vacíos ni mensajes «próximamente» en la búsqueda dirigida. Roles y permisos es informativo, sin edición ficticia. Esto es una revisión acotada, no una garantía exhaustiva de todos los controles posibles.
- Las rutas OTP, Kanban simulado y venta ficticia responden 404 en el servidor real aislado. No se implementó recuperación por correo.

## Comandos reproducibles

Desde la raíz, con las dependencias existentes de backend/frontend instaladas:

```powershell
npm.cmd --prefix e2e ci
node e2e/node_modules/playwright/cli.js install chromium
node e2e/backend-regression.cjs
node --test frontend-app/tests/*.test.js
npm.cmd --prefix frontend-app run lint
npm.cmd --prefix frontend-app run build
node e2e/run.cjs
git diff --check
```

El ejecutor E2E lanza exactamente:

- Backend: `node src/index.js`, directorio `backend/`, con `DB_NAME` temporal, `PORT` libre, `JWT_SECRET` efímero y `NODE_ENV=test`.
- Frontend: `node frontend-app/node_modules/vite/bin/vite.js --host 127.0.0.1 --port <puerto libre> --strictPort`, directorio `frontend-app/`, con `VITE_API_URL` apuntando al backend aislado. El ejecutor convierte la ruta del CLI a absoluta.
- Pruebas: CLI de `@playwright/test` con `test`, directorio `e2e/`, usando `E2E_WEB_URL`, `E2E_API_URL`, `E2E_DATABASE` y contraseña efímera del proceso. No ejecutar los specs contra servidores habituales.

## Limitaciones y pendientes fuera de V1

- Recuperación por correo/OTP real: requiere proveedor y evolución segura; sigue fuera de V1.
- MySQL 8, Firefox, WebKit, dispositivos móviles reales, pruebas de carga prolongada e impresión física no certificados.
- No se implementaron imágenes de productos, rediseño de Nuevo Pedido ni nuevos módulos.
- Build avisa del tamaño del bundle superior a 500 kB. Las pruebas frontend paralelas pueden advertir colisión de HMR 24678; no fallaron. Algunas pruebas SQL con VM emiten una advertencia de Express sobre Promise de otro contexto. No se ocultaron esas advertencias.
- La certificación es del entorno y flujos indicados, no una declaración de ausencia absoluta de defectos ni de cobertura E2E completa.

## Resultados finales

| Validación | Resultado |
| --- | --- |
| Backend completo, banderas SQL habilitadas en BD aislada | 554 aprobadas, 0 fallidas, 0 omitidas. |
| Frontend | 439 aprobadas, 0 fallidas, 0 omitidas. |
| Playwright Chromium + API real | 8 aprobadas, 0 fallidas. |
| Frontend lint | Aprobado. |
| Frontend build | Aprobado, con aviso de tamaño de bundle. |
| `git diff --check` | Sin errores. |

Total aprobado: 1.001 pruebas. La primera ejecución backend sin todas las banderas SQL produjo 81 aprobadas y 41 omitidas; fue reemplazada como resultado final por la ejecución aislada ampliada indicada arriba. Se corrigió además la detección de banderas que contienen dígitos (`COMPRAS_FASE2`), de modo que la última ejecución incluye todas las suites SQL y no omite ninguna. No se cuentan las ejecuciones diagnósticas fallidas como aprobadas.
