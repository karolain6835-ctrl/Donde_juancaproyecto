# Validación antes del despliegue — 2 y 3 de noviembre de 2026

Se validó una copia limpia de la rama, separada de los cambios locales previos
de juegos sin pedido, migraciones, frontend, móvil, Postman y entregas.
El commit remoto `5902a05` se conserva como antecesor; no se reescribe su historial.

## Aislamiento

- MariaDB **10.4.32**, ejecutada con `--no-defaults`, directorio de datos nuevo y
  puerto **33317**, enlazado exclusivamente a `127.0.0.1`.
- No se consultó ni se modificó la instancia de Railway ni la base XAMPP habitual.
- El esquema se instala desde los archivos SQL versionados, sin copiar registros
  reales. Cada ejecución usa `dj_v1_regression_<UUID>` y lo elimina al finalizar.
- Las variables `DB_*` se sobrescriben únicamente en el proceso hijo de pruebas.
  Los archivos `.env` y las credenciales de la aplicación permanecen intactos.
- El ejecutor rechaza el puerto 3306 y cualquier servidor que no sea MariaDB 10.4.

## Ejecución reproducible

Con una instancia local desechable ya iniciada, configurar `POOL_TEST_PASSWORD`
con su contraseña de pruebas y, opcionalmente, `POOL_TEST_PORT` (33317 por defecto).
Desde `backend`:

```text
npm run test:integration:pool
```

El script `scripts/validar-pool-mariadb.cjs` verifica la versión, instala un
esquema nuevo, habilita todas las banderas `RUN_MYSQL_*`/`RUN_MARIADB_*` y ejecuta
las suites en serie, con reporte TAP. Admite nombres exactos de archivos para
repetir únicamente una suite durante el diagnóstico.

## Cobertura observada

Resultado final del 3 de noviembre: **621 pruebas aprobadas, 0 fallos,
0 canceladas y 0 omitidas**, en 88,3 segundos. Se habilitaron las 48 pruebas
originalmente omitidas, además de las pruebas nuevas de integración del pool
y salud. El conteo incluye los subtests de las suites SQL/HTTP.

La ejecución independiente `npm test` aprobó 102 pruebas, con 50 pruebas de
integración optativas omitidas por diseño; todas ellas se ejecutaron en el
comando de integración completo. Sintaxis comprobada en 150 archivos JS/CJS.

- Pagos parciales, verificación/rechazo, idempotencia y reservas por división.
- Divisiones por ítems, cuotas, modalidades, concurrencia y límites de saldo.
- Ventas/comprobantes y liquidación de pedidos y mesas.
- Inventario, movimientos, alertas, mermas, ajustes, recepciones y reversos.
- Pedidos, rondas, participantes, consolidación y concurrencia.
- Cierres de caja, snapshots, diferencias, rollback y cierre concurrente único.
- **1.310 respuestas HTTP** en la suite de contextos/pagos concurrentes:
  cero errores SQL, cero respuestas 500 y diez cierres únicos, con stock intacto.
- Pool real: conexión reservada, commit, rollback, liberación idempotente y
  `KILL` de conexiones en reposo y durante transacciones, sin terminar Node.
- API real detrás de un proxy TCP conectado a MariaDB 10.4:
  `/api/health` devuelve **200 → 503 → 200** al cortar y restaurar la conexión;
  el mismo proceso sigue vivo durante toda la secuencia.
- Sockets simulados: ECONNRESET, escritura interrumpida, timeout de conexión y
  consulta, COMMIT interrumpido y saturación, sin reintentos de escrituras.

## Correcciones de los arneses

La primera ejecución detectó fixtures que omitían `mesas.creado_en` pese a ser
obligatorio en la baseline. Se agregó la fecha explícitamente a esos INSERT de
prueba. También se corrigieron resoluciones de `fechaHora` y del controlador de
salud dentro de los mocks de montaje de Express. No se relajaron restricciones
SQL ni se cambiaron tablas de la aplicación para hacer pasar las pruebas.

Las pruebas heredadas de transacciones conservan sus conexiones con SQL real y
fallos inyectados mediante el adaptador explícito `poolRequire`. Las pruebas
`pool-conexion` y `health-mariadb` ejercitan el pool real y el proceso real de API.
Se retiró el listener de `uncaughtException` de la prueba remota del pool para que
un error no manejado haga fallar la prueba normalmente.

## Límites

La validación confirma compatibilidad con MariaDB **10.4.32**. No prueba todas las
revisiones 10.4 ni la red privada y carga real de Railway. Queda pendiente observar
el despliegue aprobado durante varios ciclos superiores a diez minutos.
Este trabajo no fusiona el PR ni despliega la aplicación.
