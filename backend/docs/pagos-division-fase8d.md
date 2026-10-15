# Pagos de división — fase 8D

## Auditoría y contratos conservados

- POST /api/pagos: `{id?,metodo_de_pago,total_seleccionado,pedidos_id,
  sesion_division_id?,participante_id?}`. Actor del JWT, nunca del body.
  Importe decimal normal positivo con hasta dos decimales. Métodos: efectivo,
  nequi, daviplata, tarjeta. Roles Administrador/SuperAdmin/Mesero/Mesera/Cajero.
  Devuelve 201 con id_pago, estado pendiente, verificacion_estado pendiente y
  el resultado de liquidación existente.
- GET /api/pagos/:id: lectura individual existente, solo Administrador,
  SuperAdmin y Cajero. No se amplían sus roles ni se duplica esta ruta.
- PATCH /api/pagos/:id/verificar: `{verificacion_estado:'verificado'|'rechazado'}`,
  Administrador/SuperAdmin/Cajero. Devuelve id_pago, estados y liquidación.
  La misma decisión ya es idempotente; una decisión contraria posterior falla.

Participante_id de pagos identifica division_participantes.id, no jugadores.id.
Pagos pendientes reservan saldo; verificado+pagado reduce deuda; rechazado+
cancelado libera reserva. Límites por pedido y pagador y coherencia de visita
son los existentes. División desactualizada, cancelada o completada bloquea
nuevos pagos mediante backend. No se cambian estas reglas en 8D.

## Lectura mínima añadida

GET /api/sesiones-division/:id/pagos, con JWT y los mismos roles que consultan
división y registran pagos. Devuelve `{datos:[...]}` exclusivamente para esa
sesion_division_id, ordenado por creado_en/id. Incluye id, método, importe,
estados, fechas, pedido/división/pagador y nombre del pagador cuando existe.
404 si no existe la división. Divisiones finalizadas se pueden consultar.
No se añade listado global, modelo, migración ni escrituras de inventario.

## Idempotencia persistente reutilizada

Pagos.id VARCHAR(20) es PK real y POST acepta id. El frontend genera un ID por
intención y persiste exactamente el body en sessionStorage; usa el mismo ID al
reintentar, incluso tras recargar. La PK y el bloqueo del pedido evitan duplicar
el pago. Dos solicitudes concurrentes con igual ID producen una sola fila:
201 y 409. Se conserva la respuesta 409 existente para no romper otros clientes.

Si se pierde respuesta o hay conflicto, el frontend consulta el listado real y
solo reconoce como confirmado el mismo ID, pedido, división, pagador, método e
importe. No inventa éxito ni genera otro ID al recuperar. Si contenido difiere,
conserva el error. Si la consulta también falla, mantiene el body para reintento.
Un pago rechazado se muestra como tal; volver a pagar es una intención nueva
con ID nuevo, no modificar el rechazado.

## Integración y límites

PagosDivision renderiza la información real dentro de cada cliente del resumen.
Valor usa parser COP y centavos; máximo = saldo backend menos reserva pendiente.
Después de registrar/verificar/rechazar consulta historial, división, contexto
del pedido y lista de cuentas, sin ajustar cifras optimistamente. Ítems que
pertenecen a otro pedido no se cobran usando el pedido abierto en el drawer.
Los pagos históricos sin pagador conocido permanecen visibles en un bloque
secundario. Estados finales son de solo consulta; desactualizada bloquea nuevos
pagos y verificación, pero permite rechazar pendientes según roles existentes.

No se modifican liquidacionService ni el cierre/liberación existente. Importante:
la verificación actual ya puede cerrar un pedido, actualizar cantidad_pagada y
liberar mesa si cumple sus reglas. 8D reutiliza esa operación sin añadir flujos
ni automatismos nuevos de cierre; coordinar una política distinta pertenece a
la fase 8E. Tampoco modifica stock/CPP, juegos, rondas, Kanban, comprobantes o caja.

CajaPage → Pagos sigue pendiente: contiene listado, indicadores y balance
simulados. Sustituirlo correctamente requiere un listado global autorizado con
paginación/filtros y fuentes reales para sus indicadores/balance. No se mezcló
esa ampliación con el historial acotado de división. La entrada real de 8D es
Caja → Cuentas pendientes → Dividir cuenta → cliente → Registrar pago.
