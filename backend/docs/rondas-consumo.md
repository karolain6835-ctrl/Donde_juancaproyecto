# Rondas de consumo (fase 7C)

Una ronda es un evento confirmado dentro de una visita y un pedido abierto. No
reutiliza `rondas` de juegos. El pedido sigue siendo el contenedor operativo y la
tarjeta Kanban; una visita puede tener rondas en varios pedidos. La numeración
es independiente dentro de cada pedido.

Aplicar `v2.40_rondas_consumo.sql` después de v2.39 antes del despliegue. Es
repetible, conserva históricos con `pedido_items.ronda_consumo_id=NULL`, añade
FKs e índices y no modifica ni reconstruye consumos. Se validó en bases
desechables, sin aplicar migraciones a la BD instalada.

`rondas_consumo` guarda pedido (FK obligatoria), número, estado confirmada/cancelada,
fecha UTC, actor JWT, clave idempotente y SHA-256 de la solicitud normalizada.
No existe borrador persistente ni endpoint para editar una ronda confirmada.
El estado cancelada queda previsto; esta fase no introduce cancelación global
de rondas. La cancelación existente por ítem conserva sus reglas e inventario.

## Endpoints

- GET `/api/pedidos/:pedido_id/rondas` → `{datos:[rondas]}`,
  con sus líneas, personas, productos, cantidades, precios y estados reales.
- GET misma ruta `/:ronda_id` → `{datos:ronda}`.
- POST ruta base, header `Idempotency-Key` ASCII de 8 a 128 caracteres:
  `{items:[{participante_id,productos_id,cantidad}]}`.
  Entre 1 y 100 líneas; cantidades enteras positivas hasta INT máximo.
  No recibe precio, estado, cantidad pagada, ID de ítem ni movimientos.

Lecturas: Administrador/SuperAdmin/Mesero/Mesera/Cajero. Confirmación:
Administrador/SuperAdmin/Mesero/Mesera. JWT y responsables existentes intactos.

POST nuevo devuelve 201 `{datos:ronda}`. Reintento de misma clave/contenido
devuelve 200 con la misma ronda y sin escrituras adicionales, incluso si la
visita ya se cerró. Misma clave con otro contenido devuelve 409. La clave es
única por pedido y se conserva indefinidamente con la ronda.

## Atomicidad y concurrencia

Una conexión/transacción bloquea mesa y pedido siguiendo el orden existente; al confirmar bloquea y valida su visita derivada. Valida visita activa,
pedido abierto de la visita, personas del mismo ámbito, productos activos y
precio de venta actual positivo. Bloquea productos en orden de ID, obtiene
el siguiente número bajo bloqueo y crea ronda/líneas/movimientos.

Las lecturas de clave, numeración y detalle usan lecturas bloqueantes actuales:
no dependen de un snapshot anterior a esperar el bloqueo en REPEATABLE READ.
UNIQUE(pedido,número) y UNIQUE(visita,clave) completan la protección concurrente.
Si falla cualquier línea, movimiento o commit, se revierte todo. El cliente
reintenta los conflictos con su misma clave/cuerpo.

`pedidoItemsService` comparte el código de alta y movimiento con pedidos. La
consolidación exige pedido + ronda (NULL seguro) + persona + producto + precio
+ estado enviado/preparando. Rondas distintas nunca se fusionan; las altas
ordinarias NULL tampoco se fusionan con rondas. Solo descuenta la cantidad
adicional solicitada y registra el ejecutor JWT. Nuevos ítems: enviado y
cantidad_pagada=0. No se toca CPP ni diseño/transiciones del Kanban.

## Frontend y repetición

Solo el detalle del pedido muestra sus propias rondas, sin selector de otro pedido. La ?nica acci?n Ronda abre un borrador precargado que
permite cambiar persona/producto/cantidad, quitar/agregar líneas e incorporar
participantes mediante la API existente. Ronda copia solo persona/producto/
cantidad de líneas no canceladas; no copia IDs de ítem, pagos, estados ni precios.
Siempre requiere Confirmar ronda. Usa catálogos reales y demanda agregada por
producto para validar stock; backend revalida el precio/stock al confirmar.

Ante error de red, 500 o 409 concurrente mantiene cuerpo/clave y bloquea modificaciones para
reintento seguro. Errores de validación definitivos permiten corregir el
borrador; si falla stock reconsulta catálogos. Los listados, stock, cuenta y
detalle se reconsultan tras confirmación, sin añadir datos optimistamente.
El borrador/intento vive en el componente; cerrar o recargar la pantalla no
persiste un borrador. Antes de iniciar otro, consultar las rondas confirmadas.

La cuenta existente suma las mismas líneas reales y mantiene totales/juegos.
Los consumos personales incluyen todas las rondas automáticamente por su
participante y visita; no se cambian contratos ni fórmulas de pagos.

La visita se deriva exclusivamente mediante ronda -> pedido -> sesion_mesa; no se almacena en rondas_consumo. No se crea un pedido al confirmar una ronda.

Ronda usa la confirmada de mayor numero_ronda; si no existe, usa los items sueltos del pedido (ronda_consumo_id NULL). Excluye cancelados. Sin consumos copiables no ofrece la acci?n ni un bloque vac?o. El detalle devuelve productos_id y ronda_consumo_id para identificar esos consumos sin inferir IDs por nombre.
