# División de cuenta real — fase 8C

Entrada: Caja → Cuentas pendientes. La lista usa pedidos reales, paginación y
búsqueda dentro de la página. Permite consultar abiertos y cerrados: un pedido
cerrado puede tener una división que aún necesita completarse explícitamente.
Se retiraron de esta sección las cuentas/pagos simulados y sus mutaciones locales.
Las demás pestañas de Caja quedan fuera de esta integración.

## Lectura mínima que faltaba en backend

Las seis rutas de división no permiten descubrir IDs existentes, calcular el saldo
actual antes de configurar cuotas ni recuperar unidades ya asignadas en otras
divisiones. Se añadió únicamente GET /api/pedidos/:pedido_id/division-contexto,
JWT y roles Administrador/SuperAdmin/Mesero/Mesera/Cajero. No hay nuevas migraciones.

Devuelve datos del pedido/visita/mesa, saldo calculado mediante liquidacionService,
pagos pendientes de verificación, total definitivo, productos no cancelados con
precio histórico y cantidades disponibles, y divisiones relacionadas. Usa lecturas
bloqueantes en una transacción; no modifica datos, stock, pagos o reglas de reparto.
Cabeceras vacías de la visita también se muestran para recuperar creaciones cuya
respuesta se perdió. No se atribuyen esas cabeceras vacías a un pedido inventado.

## Confirmación

Por productos permite cantidades para varios clientes, mostrando asignadas frente
a disponibles y bloqueando excesos. Se agrupa una solicitud por pagador; solo envía
jugadores_id y pedido_item_id/cantidad. No envía precio ni el nombre como identidad.
Las asignaciones a clientes distintos son operaciones independientes de backend:
si falla una posterior, las anteriores permanecen y la UI permite revisarlas.

Iguales muestra estimación en centavos, usando el mismo orden de IDs y distribución
del residuo del servidor. Paga uno envía un cliente. Personalizada usa parseCOPInput
para validar y calcula/suma centavos desde los dígitos del texto; exige clientes
distintos, montos positivos y suma exacta. Backend es autoridad de todas las cuotas.

El servicio usa apiClient. Cada asignación/configuración guarda clave idempotente,
body y cursor de pasos confirmados. Intención pendiente en sessionStorage (sin
tokens); si no está disponible, queda en memoria. Reintentos conservan body/clave.
Si se pierde la respuesta al crear la cabecera, no se repite automáticamente:
actualizar divisiones y abrir la existente. Volver a la cuenta descarta solo esa
intención sin cuotas; no borra cabeceras ni dispara otra creación por su cuenta.

No hay sumas optimistas. Después de confirmar, se consulta GET división y contexto.
La división existente se puede volver a abrir tras recargar. Un fallo definitivo
antes de asignar permite corregir en la cabecera real; fallos intermedios conservan
la intención para reintento o revisión de lo efectivamente confirmado.

## Resumen y permisos

Saldo backend incluye pagos todavía no verificados. La etiqueta UI Saldo por pagar
muestra max(0,saldo - pendiente_verificacion); los pendientes se muestran por
separado y se explica que aún requieren verificación. No se cambian saldos backend.

Activa, Completada y Cancelada se muestran traducidas. Estados finales no permiten
edición. Desactualizada muestra aviso y bloquea configuración/finalización. Cancelar
y completar requieren confirmación y permisos equivalentes a sus rutas backend
(Administrador/SuperAdmin/Cajero). Botones se muestran cuando los datos actuales
indican que tiene sentido; las respuestas 409 del servidor se muestran igualmente.

No se implementan recepción/verificación de pagos, reparto multi-pedido ni juegos
divididos en esta fase. El resumen refleja los pagos reales del backend al actualizar.

## Continuacion 8D

Los pagos por cliente ya se integran mediante PagosDivision y pagosService.
Ver backend/docs/pagos-division-fase8d.md para contratos, roles, recuperacion de
reintentos y el alcance pendiente del listado global de Caja.
