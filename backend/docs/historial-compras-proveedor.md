# Historial de compras por proveedor

Se reutilizan `GET /api/compras?proveedores_id=:id&pagina=1&limite=20` y `GET /api/compras/:id`, disponibles para Administrador y SuperAdmin. El filtro valida ahora la existencia del proveedor (404), admite proveedores inactivos y conserva la paginación máxima de 100, orden por fecha e ID descendentes y transacción de lectura consistente.

Relaciones: `compras.proveedores_id → proveedores.id`, `compra_items.compras_id → compras.id` y `compra_items.productos_id → productos.id`. No se usa el proveedor actual del producto para atribuir compras históricas. La cabecera paginada no hace JOIN con productos, por lo que no multiplica compras. Solo se consulta el detalle elegido, sin N+1 por página.

Se muestran fecha, referencia, estado, total estimado y total recibido persistidos. El detalle devuelve cantidades pedidas, precio histórico y `subtotal = cantidad * precio_unitario` calculado por MySQL con DECIMAL; el subtotal representa lo pedido, no necesariamente lo recibido. No se recalculan precios a partir del catálogo actual ni se modifica stock, CPP, compras o recepciones.

Los nombres de producto son los actuales del catálogo; no hay snapshot histórico de esos nombres. No se inventan observaciones, documentos adjuntos, fechas de factura ni números comerciales de compra. La referencia corta visible puede consultarse completa en su atributo title. No hay migraciones.
