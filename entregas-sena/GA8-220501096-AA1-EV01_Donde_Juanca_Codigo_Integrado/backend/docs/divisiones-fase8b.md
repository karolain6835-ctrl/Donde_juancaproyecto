# Fase 8B: cuotas monetarias y ciclo de vida

Aplicar v2.42 después de v2.41 antes del despliegue. No se modifican migraciones
anteriores ni se ejecutó DDL contra la base persistente. Los históricos reciben
el default activa, sin inferir si terminaron o vincularlos a visitas/pedidos.

## Endpoints y roles

JWT y actores actuales. Crear, consultar, asignar y definir cuotas: Administrador,
SuperAdmin, Mesero, Mesera y Cajero. Completar/cancelar: Administrador, SuperAdmin
y Cajero, igual que la decisión de verificar/rechazar pagos.

- POST /api/sesiones-division: `{mesas_id,modalidad}`; modalidad items,
  equitativa, total o personalizada. Obtiene la visita activa de backend.
- POST /api/sesiones-division/:id/asignar-items: contrato 8A intacto,
  `{jugadores_id,items:[{pedido_item_id,cantidad}]}` y Idempotency-Key.
- POST /api/sesiones-division/:id/cuotas, Idempotency-Key obligatorio:
  - equitativa: `{pedido_id,jugadores_ids:["a","b"]}`;
  - total: `{pedido_id,jugadores_id:"a"}`;
  - personalizada: `{pedido_id,cuotas:[{jugadores_id:"a",monto:"40.00"},...]}`.
- GET /api/sesiones-division/:id: resumen ampliado.
- PATCH /api/sesiones-division/:id/completar y /cancelar: sin datos adicionales.

Importes de cuotas, saldo y totales nuevos: strings decimales exactos. Conserva
total_acumulado y total_asignado individual numéricos de la respuesta previa,
así como nombres de propiedades de los detalles. Los nuevos campos individuales
asignado/pagado/pendiente_verificacion/saldo son strings. Saldo = asignado menos
pagado verificado; los pendientes se muestran separados y reservan capacidad
de pago mediante el flujo existente. No se exponen claves/hash internos.

## Objetivo monetario y alcance

Se cubre un pedido abierto de la misma visita por división monetaria. No se
implementa multi-pedido: pagos exige pedidos_id y no se puede distribuir una
cuota entre varios pedidos sin cambiar ese contrato. Items mantiene su alcance
8A: cada asignación de un solo pedido; varias operaciones pueden corresponder
a diferentes pedidos de la visita.

Objetivo monetario = saldo real de calcularCuenta (productos a precio histórico
no cancelados + costo registrado de juegos - pagos verificados). Se exige total
definitivo, saldo positivo y ausencia de pagos pendientes al definir cuotas.
Esto no es reparto explícito de juegos: no se crean asignaciones de juego.
Pagos anteriores al reparto permanecen fuera del objetivo y del pagado de esta
división. Se almacena también el total real base del pedido para detectar cambios.

No se admite otra división activa con cuotas o asignaciones del mismo pedido.
Items tampoco admite asignaciones mientras exista una división monetaria activa.
No se duplican productos, stock ni movimientos al definir cuotas.

Centavos BigInt de liquidacionService. Equitativa ordena jugadores_id y reparte
el residuo de un centavo a los primeros IDs. Ejemplo 100.00/3: 33.34,33.33,33.33.
No hay cuotas cero. Personalizada exige montos positivos de hasta dos decimales,
pagadores únicos y suma exacta al objetivo; cuotas mayores al DECIMAL(10,2)
existente son rechazadas. Los fallos revierten toda la operación y auditoría.

Una configuración por división. Clave/hash de body normalizado (pagadores
ordenados): replay devuelve 200 y mismos IDs; primera definición devuelve 201.
Otra configuración o contenido devuelve 409, aun con otra clave. No hay edición
silenciosa ni cuotas duplicadas. Se mantienen replays de lectura tras finalizar.

## Ciclo de vida y cambios de consumo

Solo activa admite escrituras nuevas y pagos. PATCH completar requiere cuotas
no vacías, cada cuota exactamente pagada, sin pendientes (incluidos pagos sin
cuota), datos coherentes y total definitivo. No completa por existir asignaciones.
La finalización es explícita: verificar pagos no implica completar la división.
Completar/cancelar registra actor JWT, fecha UTC y auditoría en la transacción.
Repetir el mismo estado devuelve 200; completada/cancelada son terminales y los
cambios cruzados devuelven 409. No existe reapertura.

Cancelar requiere ausencia de pagos verificados y pendientes asociados. Rechazar
primero los pendientes por el endpoint de pagos; no se borran ni se rechazan
automáticamente. Cancelar libera las cantidades asignadas para futuros repartos;
completar no las libera, ya fueron pagadas. Detalles históricos se conservan.

Si cambia el consumo o hay pagos externos posteriores al objetivo monetario,
GET devuelve desactualizada=true. Se bloquean pagos/verificaciones y completar,
sin alterar cuotas. Sin pagos verificados: rechazar pendientes, cancelar y crear
otra división con el objetivo actualizado. Con pagos verificados: requiere
conciliación explícita; no se implementa reasignación ni reembolso automático.

Items guarda snapshots de totales reales por pedido al asignar. Nuevos consumos
se detectan y bloquean pagos/completar; una asignación explícita puede actualizar
la base si no hay pagos, nunca cambia las asignaciones anteriores. Si hay pagos
requiere conciliación. Los históricos sin snapshot no reciben bases inferidas;
mantienen las comprobaciones de identidad, producto, precio y cantidades 8A.

## Mesas y límites conservados

Solo cabeceras activa bloquean una mesa destino o se trasladan. Completadas y
canceladas conservan su ubicación histórica. La tabla original sesiones_division,
sin API ni ciclo de vida, se trata como historial y ya no bloquea ni se mueve.
Cabeceras históricas con estado default activa requieren cancelación/finalización
explícita; no se clasifican automáticamente.

La liberación sigue calculando la deuda real, pedidos abiertos, juegos activos y
pagos pendientes; una división no sustituye ese cálculo ni perdona deuda. Completar
o cancelar no cambia estado de pedido/mesa, stock ni pagos. La liquidación de pagos
y liberación manual conservan su flujo. No se añaden UI, propinas, descuentos,
recargos, comprobantes por pagador o reparto de cargos de juego.
