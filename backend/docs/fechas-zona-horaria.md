# Contrato de fechas y zona horaria

## Referencia operativa

El negocio usa `America/Bogota` (UTC−05:00, sin horario de verano).
«Hoy», semana, mes y días seleccionados son fechas del calendario colombiano,
independientemente de la zona del navegador, Node o del servidor SQL.

Los timestamps JSON representan instantes UTC mediante ISO 8601 con `Z`.
Una fecha sin hora (`YYYY-MM-DD`) representa un día de calendario y no se desplaza.
El frontend presenta instantes en Bogotá mediante el helper compartido
`frontend-app/src/utils/businessTime.js` y `dateTime.js`.

## Auditoría y conservación del almacenamiento existente

La base local auditada usa MariaDB 10.4.32. Sus columnas operativas de hora son
`DATETIME`, no `TIMESTAMP`: MariaDB no convierte automáticamente su zona.
La sesión auditada tenía `time_zone=SYSTEM`, sistema `America/Bogota`.
Antes del cambio, mysql2 usaba implícitamente la zona de Node al leerlas.

Las convenciones existentes se conservan por columna; no hay migración ni
reescritura de registros históricos:

| Almacenamiento | Columnas relevantes |
| --- | --- |
| Hora civil de Bogotá | `pedidos.creado_en`, `pagos.creado_en`, `sesiones_division_cuentas.creado_en`, `division_participantes.creado_en`, `division_items_detalle.creado_en`, `kanban_movimientos.creado_en` |
| UTC | `rondas_consumo.creada_en`, `pagos.verificado_en`, fechas de juegos/visitas, auditoría, comprobantes, cierres de caja y sus intervalos, eventos de recepción de compras |

Las lecturas de columnas locales convierten explícitamente Bogotá → UTC con
`fechaLocalSQL` de `src/utils/fechaHora.js`. Añadir `Z` sin convertir una hora
local era un error y producía el desfase del historial.
Las lecturas de UTC usan UTC, incluido el driver (`timezone: 'Z'`). Las fechas
SQL `DATE` se leen como cadenas de calendario. Las rondas proyectan UTC
explícitamente, evitando una conversión adicional por la zona del proceso.

Las escrituras locales de pagos/divisiones/kanban usan `horaBogotaSQL` en vez de
depender de `NOW()` o de defaults del servidor. Pedidos usa `fechaBogota()`;
ya no resta cinco horas manualmente. Las escrituras UTC permanecen UTC.
`CONVERT_TZ` usa offsets explícitos centralizados y no requiere instalar las
tablas de zonas horarias de MariaDB.

## Filtros y cierres

Los parámetros `desde`/`hasta` de pagos conservan su forma `YYYY-MM-DD` y filtran
la fecha civil de creación almacenada. El inicio es inclusivo y el fin es el
inicio exclusivo del día siguiente. Dashboard y ventas envían el día de Bogotá.

Los endpoints de cierres conservan sus intervalos UTC existentes. Un formulario
con `2026-10-19 00:00` hasta `2026-10-20 00:00` en Bogotá envía
`2026-10-19T05:00:00` hasta `2026-10-20T05:00:00`. Los reportes de caja usan el
mismo intervalo. No se vuelven a desplazar los intervalos ya almacenados.

## Límites y validación

La prueba de integración escribe pagos divididos a las 00:05 y 23:55 de un mismo
día en una base desechable, simulando una sesión SQL en UTC+09. Comprueba valores
crudos, relectura por otra conexión, historial, rondas, cuotas, liquidación y
cierre. El frontend verifica las zonas UTC, Tokio, Bogotá y Los Ángeles.

No es posible inferir la zona original de un `DATETIME` importado por fuera del
contrato ni de filas antiguas editadas manualmente. Esas filas requieren evidencia
de origen; no se corrigen mediante heurísticas ni desplazamientos masivos.
Los clientes externos que interpretaban como UTC una hora local incorrectamente
etiquetada con `Z` observarán ahora el instante correcto; claves y formatos JSON
se conservan.

## Verificacion realizada

- Backend general: 81 aprobadas, 47 integraciones optativas omitidas.
- Backend relacionado con integraciones activadas: 138 aprobadas, sin fallos.
- Frontend: 455 aprobadas, sin fallos.
- E2E de dashboard, ventas y caja con reloj 00:05/23:55 y navegadores UTC/Tokio.
- E2E del pedido historico y rondas en UTC/Tokio con recarga: mismas horas de Bogota.
- Lint, build y git diff --check aprobados.
- Sin migraciones, reescritura historica ni commit.

## Archivos de la correccion

- `backend/docs/fechas-zona-horaria.md`
- `backend/src/config/db.js`
- `backend/src/controllers/divisionContextoController.js`
- `backend/src/controllers/divisionPagosController.js`
- `backend/src/controllers/divisionesController.js`
- `backend/src/controllers/kanbanController.js`
- `backend/src/controllers/pagosController.js`
- `backend/src/controllers/pedidosController.js`
- `backend/src/controllers/rondasConsumoController.js`
- `backend/src/services/divisionCuotasService.js`
- `backend/src/services/divisionesService.js`
- `backend/src/services/historialClientesService.js`
- `backend/src/services/pagosLecturaService.js`
- `backend/src/utils/fechaHora.js`
- `backend/tests/endpoints-simulados-retirados.test.js`
- `backend/tests/fechas-bogota.test.js`
- `backend/tests/identidad-ejecutor.test.js`
- `backend/tests/pagos-liquidacion.test.js`
- `backend/tests/pedidos-clientes.test.js`
- `frontend-app/src/components/CierresCajaSection.jsx`
- `frontend-app/src/services/cierresCajaService.js`
- `frontend-app/src/services/dashboardService.js`
- `frontend-app/src/services/reportesService.js`
- `frontend-app/src/utils/businessTime.js`
- `frontend-app/src/utils/dateTime.js`
- `frontend-app/tests/dashboard-real.test.js`
- `frontend-app/tests/fechas-bogota.test.js`
- `frontend-app/tests/reportes-reales.test.js`
