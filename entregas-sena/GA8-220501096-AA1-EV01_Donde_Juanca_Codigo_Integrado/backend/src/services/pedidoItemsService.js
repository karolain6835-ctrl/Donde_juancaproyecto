const crypto = require('crypto');
const errorPedido = (status, mensaje) => Object.assign(new Error(mensaje), { status });
const registrarMovimientoPedido = async (conexion, pedido, producto_id, cantidad, stock_antes, actor) => {
  const [usuarios] = await conexion.query('SELECT id FROM usuarios WHERE id = ? LOCK IN SHARE MODE', [actor]);
  if (!usuarios.length) throw errorPedido(409, 'El ejecutor del movimiento no existe.');
  const stock_despues = stock_antes + cantidad;
  if (!Number.isInteger(stock_antes) || stock_despues < 0 || stock_despues > 2147483647 ||
      cantidad < -2147483648 || cantidad > 2147483647) {
    throw errorPedido(409, 'Existencia o movimiento fuera del rango permitido.');
  }
  // venta negativa: salida; venta positiva: reversión por cancelación.
  const [movimiento] = await conexion.query(`
    INSERT INTO movimientos_inventario
    (id, tipo, cantidad, stock_antes, stock_despues, referencia_tipo,
     referencia_id, productos_id, usuarios_id, creado_en)
    VALUES (?, 'venta', ?, ?, ?, 'pedido', ?, ?, ?, UTC_TIMESTAMP())`,
    [crypto.randomUUID(), cantidad, stock_antes, stock_despues, pedido.id, producto_id, actor]
  );
  if (movimiento.affectedRows !== 1) throw new Error('No se registró el movimiento del pedido.');
};

// El llamador valida la entrada y bloquea el pedido (y su visita cuando aplica).
// Compartido por altas ordinarias y confirmaci?n de rondas en la misma transacci?n.
async function agregarLineaPedido(conexion, pedido, datos, actor, ronda_consumo_id = null) {
  const { productos_id, cantidad_pedida, precio_unitario, participante_id = null } = datos;
  if (participante_id !== null) {
    if (typeof participante_id !== 'string' || !participante_id.trim() || participante_id.length > 36) throw errorPedido(400, 'Participante inválido.');
    const columna = pedido.sesion_mesa_id ? 'sesion_mesa_id' : 'pedido_id';
    const [[participante]] = await conexion.query(`SELECT id FROM jugadores WHERE id=? AND ${columna}=? FOR UPDATE`, [participante_id, pedido.sesion_mesa_id || pedido.id]);
    if (!participante) throw errorPedido(409, 'El participante no pertenece a la visita o pedido.');
  }
  // El bloqueo del padre serializa también dos altas concurrentes sin línea previa.
  const [compatibles] = await conexion.query(`SELECT id,cantidad_pedida,pedido_id,producto_id
    FROM pedido_items WHERE pedidos_id=? AND productos_id=? AND precio_unitario=?
    AND participante_id <=> ? AND ronda_consumo_id <=> ? AND estado IN ('enviado','preparando') ORDER BY id LIMIT 1 FOR UPDATE`,
  [pedido.id, productos_id, precio_unitario, participante_id, ronda_consumo_id]);
  const compatible = compatibles[0];
  if (compatible && (compatible.pedido_id !== pedido.id || compatible.producto_id !== productos_id)) {
    throw errorPedido(409, 'Referencias del ítem inconsistentes.');
  }
  if (compatible && (!Number.isInteger(compatible.cantidad_pedida) || compatible.cantidad_pedida <= 0 || compatible.cantidad_pedida + cantidad_pedida > 2147483647)) {
    throw errorPedido(409, 'La cantidad acumulada excede el rango permitido o es inconsistente.');
  }
  const [productos] = await conexion.query(
    'SELECT cantidad_disponible, nombre FROM productos WHERE id = ? FOR UPDATE', [productos_id]
  );
  if (!productos.length) throw errorPedido(404, 'El producto especificado no existe.');
  const producto = productos[0];
  const insuficiente = () => errorPedido(400,
    `Stock insuficiente para "${producto.nombre}". Disponible: ${producto.cantidad_disponible}, solicitado: ${cantidad_pedida}.`);
  if (producto.cantidad_disponible < cantidad_pedida) throw insuficiente();

  const idItem = compatible ? compatible.id : crypto.randomUUID();
  if (compatible) {
    const [actualizacion] = await conexion.query('UPDATE pedido_items SET cantidad_pedida=cantidad_pedida+? WHERE id=?', [cantidad_pedida, idItem]);
    if (actualizacion.affectedRows !== 1) throw new Error('No se actualizó la cantidad del ítem.');
  } else {
    const [insercion] = await conexion.query(
    `INSERT INTO pedido_items
     (id, precio_unitario, pedido_id, producto_id, cantidad_pedida, cantidad_pagada, estado, pedidos_id, productos_id, participante_id, ronda_consumo_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [idItem, precio_unitario, pedido.id, productos_id, cantidad_pedida, 0, 'enviado', pedido.id, productos_id, participante_id, ronda_consumo_id]
  );
  if (insercion.affectedRows !== 1) throw new Error('No se insert? el ?tem.');
  }

  const [descuento] = await conexion.query(
    `UPDATE productos SET cantidad_disponible = cantidad_disponible - ?
     WHERE id = ? AND cantidad_disponible >= ?`,
    [cantidad_pedida, productos_id, cantidad_pedida]
  );
  if (descuento.affectedRows !== 1) throw insuficiente();

  await registrarMovimientoPedido(conexion, pedido, productos_id, -cantidad_pedida, producto.cantidad_disponible, actor);

  return { id_item: idItem, stock_restante: producto.cantidad_disponible - cantidad_pedida };
}
module.exports = { agregarLineaPedido, registrarMovimientoPedido };
