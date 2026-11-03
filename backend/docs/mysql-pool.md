# Pool MariaDB y recuperación de conexiones

Rama: `fix/mysql-pool`.

Se conserva `mysql2`, la configuración `DB_*`, UTC y el tratamiento de fechas.
No hay migraciones, cambios de credenciales ni consultas de modificación en el
arranque o en el chequeo de salud.

## Comportamiento

- Un pool por proceso, hasta 10 conexiones y 5 conexiones ociosas. Las ociosas
  caducan a los 60 segundos. Keepalive TCP a partir de 10 segundos.
- Conexión inicial: límite de 10 segundos. Consultas: 30 segundos por defecto.
  Una consulta puede especificar un timeout menor; salud usa 5 segundos.
- Saturación: rechazo inmediato, sin una cola ilimitada de solicitudes.
- `db.query()` y `db.promise().query()` conservan sus contratos.
- `await db.acquire()` reserva una conexión para una operación o transacción;
  `release()` en `finally` la devuelve. Si queda una transacción abierta o no
  se pudo revertir, se destruye la conexión. También se detectan las lecturas
  que usan `SET TRANSACTION` y `START TRANSACTION` explícitos.
- Los errores de socket tienen un listener local y mysql2 retira las conexiones
  rotas. Las peticiones posteriores pueden abrir nuevas conexiones.
- Un timeout de consulta destruye el socket. Se limpian sus temporizadores al
  fallar para evitar callbacks tardíos. No hay reintentos automáticos.
- Si se pierde la respuesta de un COMMIT, su resultado puede ser incierto:
  verificar el pago o venta existente antes de repetirlo manualmente.
- Si falla la liberación del bloqueo de administración de mesas, se destruye
  la conexión para no devolver al pool una sesión que conserva ese bloqueo.
- No se instala ningún manejador de `uncaughtException`.

## Salud

`GET /api/health`, público, sin caché:

- 200: `{"status":"ok","api":"up","database":"up"}`.
- 503: `{"status":"unavailable","api":"up","database":"down"}`.

La única consulta es `SELECT 1`. Puede usarse como healthcheck de Railway.
No requiere nuevas variables de entorno. El pool se conecta bajo demanda;
este endpoint comprueba realmente el acceso a la base de datos.

## Validación

Desde `backend`: `npm test` (en PowerShell con scripts deshabilitados,
`npm.cmd test`). El script ahora ejecuta `node --test tests/*.test.js`.

`tests/mysql-pool.test.js` usa mysql2 y sockets TCP locales con un servidor de
protocolo simulado; no conecta a Railway ni modifica MariaDB. Cubre reset en
reposo, corte durante escritura, timeout de consulta y de conexión,
transacciones, rollback fallido, COMMIT interrumpido, saturación y salud HTTP.

Las pruebas de integración siguen siendo optativas mediante sus variables
`RUN_MYSQL_*`. Se habilitaron todas sobre una instancia MariaDB 10.4.32 local,
con directorio de datos exclusivo y esquemas desechables. El ejecutor reproducible
es `npm run test:integration:pool`; véase [el informe](mysql-pool-validation.md).
`tests/helpers/poolRequire.js` adapta sus fábricas de conexiones con fallos
inyectados al contrato acquire/release, sin cambiar sus consultas ni fixtures.

La validación local no demuestra disponibilidad continua en Railway. Tras subir
y desplegar, verificar `/api/health` y observar los logs durante varios ciclos
superiores a los diez minutos del fallo original.

## Archivos de esta corrección

- `package.json`, `src/config/db.js`, `src/index.js`, `src/services/errorLog.js`.
- Nuevo `src/controllers/healthController.js`.
- Controladores que reservan/liberan conexiones: `alertasInventario`,
  `auditoria`, `clientes`, `configuracion`, `divisionContexto`, `divisionPagos`,
  `divisiones`, `inventario`, `juegos`, `kanban`, `mermas`, `mesasAdministracion`,
  `mesas`, `pagos`, `pagosLectura`, `participantes`, `pedidos`,
  `perfil`, `productoImagen`, `recuperacion`, `refrigeradores`, `rondasConsumo`,
  `sesionesMesa` (todos con sufijo `Controller.js`).
- Servicios `cierresCajaService.js`, `comprasService.js`, `comprobantesService.js`.
- Nueva prueba `tests/mysql-pool.test.js`, nuevo adaptador
  `tests/helpers/poolRequire.js` y actualización de los dobles de prueba en los
  tests existentes de los controladores y servicios anteriores. Las pruebas
  de montaje `endpoints-simulados-retirados` y `otp-retirado` incorporan el nuevo
  controlador de salud a sus dependencias simuladas.
- Este documento.

Había cambios locales anteriores, incluyendo archivos de backend, frontend y
migraciones, además del controlador `pagosJuegoController.js` sin seguimiento.
Se conservaron en el árbol de trabajo original y se excluyeron del commit mediante
un worktree limpio. Esta corrección no modifica el frontend, la app móvil ni los
archivos de migración. El commit remoto previo del pool se conserva como antecesor.

### Pruebas existentes adaptadas (archivos exactos)

- `tests/auditoria-actores.test.js`
- `tests/auditoria-lectura.test.js`
- `tests/auth-middleware.test.js`
- `tests/cierres-caja.test.js`
- `tests/clientes.test.js`
- `tests/compras-fase2.test.js`
- `tests/compras-proveedores.test.js`
- `tests/comprobantes.test.js`
- `tests/configuracion.test.js`
- `tests/cuentas-contexto-concurrencia.test.js`
- `tests/divisiones-cuotas.test.js`
- `tests/divisiones-sesion.test.js`
- `tests/endpoints-simulados-retirados.test.js`
- `tests/fechas-bogota.test.js`
- `tests/historial-proveedores.test.js`
- `tests/identidad-ejecutor.test.js`
- `tests/inventario-ajuste.test.js`
- `tests/inventario-alertas.test.js`
- `tests/inventario-movimientos.test.js`
- `tests/juegos-pedido-directo.test.js`
- `tests/juegos.test.js`
- `tests/kanban-agrupado.test.js`
- `tests/kanban-movimiento.test.js`
- `tests/login.test.js`
- `tests/mantenimiento-juegos.test.js`
- `tests/mermas-refrigeradores.test.js`
- `tests/mermas.test.js`
- `tests/mesas-administracion.test.js`
- `tests/mesas-numero.test.js`
- `tests/mesas-ocupacion.test.js`
- `tests/operacion-lecturas.test.js`
- `tests/otp-retirado.test.js`
- `tests/pagos-liquidacion.test.js`
- `tests/participantes-pedidos.test.js`
- `tests/pedidos-clientes.test.js`
- `tests/pedidos-consolidacion.test.js`
- `tests/perfil.test.js`
- `tests/producto-imagen.test.js`
- `tests/recuperacion.test.js`
- `tests/refrigeradores.test.js`
- `tests/roles-middleware.test.js`
- `tests/rondas-consumo.test.js`
- `tests/sesiones-mesa.test.js`
- `tests/usuarios-admin.test.js`

El resultado actualizado de las suites completas, los cortes TCP contra la API
real y la validación de MariaDB 10.4 está en [el informe](mysql-pool-validation.md).
