const db = require('../config/db');
const mysql = require('mysql2');
const crypto = require('crypto'); // Generador de UUIDs

// ==========================================
// 1. CREAR UN NUEVO PEDIDO
// ==========================================
const crearPedido = (req, res) => {
  const { mesas_id, usuarios_id, clientes_id } = req.body;

  if (!mesas_id || !usuarios_id || !clientes_id) {
    return res.status(400).json({ 
      error: "Faltan datos. Se requiere la mesa, el usuario que atiende y el cliente." 
    });
  }

  const id = crypto.randomUUID(); 
  const estado = 'abierto';       
  const sincronizado = 0;         
  
  const fechaActual = new Date();
  fechaActual.setHours(fechaActual.getHours() - 5); 
  const creado_en = fechaActual.toISOString().slice(0, 19).replace('T', ' ');

  const query = `
    INSERT INTO pedidos 
    (id, estado, sincronizado, creado_en, mesas_id, usuarios_id, clientes_id) 
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(query, [id, estado, sincronizado, creado_en, mesas_id, usuarios_id, clientes_id], (err, resultados) => {
    if (err) {
      console.error('❌ Error al crear el pedido:', err.message);
      return res.status(500).json({ error: 'Hubo un error en el servidor al abrir el pedido.' });
    }

    res.status(201).json({
      mensaje: '¡Cuenta abierta con éxito para la mesa! 🍻',
      id_pedido: id
    });
  });
};

// ==========================================
// 2. AGREGAR UN PRODUCTO AL PEDIDO Y DESCONTAR INVENTARIO
// ==========================================
// Conexi?n exclusiva: las consultas de otras peticiones no comparten la transacci?n.
const errorPedido = (status, mensaje) => Object.assign(new Error(mensaje), { status });

const finalizarTransaccionPedido = async (conexion, transaccionIniciada, error, res, mensaje) => {
  if (transaccionIniciada) {
    try { await conexion.rollback(); }
    catch (errorRollback) { console.error('Error al revertir pedido:', errorRollback.message); }
  }
  console.error('Error al procesar pedido:', error.message);
  return res.status(error.status || 500).json({ error: error.status ? error.message : mensaje });
};

const cerrarConexionPedido = async (conexion) => {
  if (conexion) {
    try { await conexion.end(); }
    catch (errorConexion) { console.error('Error al cerrar conexi?n de pedido:', errorConexion.message); }
  }
};

const registrarMovimientoPedido = async (conexion, pedido, producto_id, cantidad, stock_antes) => {
  const [usuarios] = await conexion.query('SELECT id FROM usuarios WHERE id = ? LOCK IN SHARE MODE', [pedido.usuarios_id]);
  if (!usuarios.length) throw errorPedido(409, 'El responsable del pedido no existe.');
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
    [crypto.randomUUID(), cantidad, stock_antes, stock_despues, pedido.id, producto_id, pedido.usuarios_id]
  );
  if (movimiento.affectedRows !== 1) throw new Error('No se registró el movimiento del pedido.');
};

const agregarItemPedido = async (req, res) => {
  const { id_pedido } = req.params;
  const { productos_id, cantidad_pedida, precio_unitario } = req.body || {};

  if (!productos_id || !precio_unitario) {
    return res.status(400).json({ error: 'Faltan datos. Se requiere el producto, la cantidad y el precio.' });
  }
  if (!Number.isSafeInteger(cantidad_pedida) || cantidad_pedida <= 0) {
    return res.status(400).json({ error: 'cantidad_pedida debe ser un entero positivo.' });
  }

  let conexion;
  let transaccionIniciada = false;
  try {
    conexion = mysql.createConnection(db.dbConfig).promise();
    await conexion.beginTransaction();
    transaccionIniciada = true;

    const [pedidos] = await conexion.query('SELECT id, usuarios_id FROM pedidos WHERE id = ? FOR UPDATE', [id_pedido]);
    if (!pedidos.length) throw errorPedido(404, 'Pedido no encontrado.');
    const [productos] = await conexion.query(
      'SELECT cantidad_disponible, nombre FROM productos WHERE id = ? FOR UPDATE', [productos_id]
    );
    if (!productos.length) throw errorPedido(404, 'El producto especificado no existe.');
    const producto = productos[0];
    const insuficiente = () => errorPedido(400,
      `Stock insuficiente para "${producto.nombre}". Disponible: ${producto.cantidad_disponible}, solicitado: ${cantidad_pedida}.`);
    if (producto.cantidad_disponible < cantidad_pedida) throw insuficiente();

    const idItem = crypto.randomUUID();
    const [insercion] = await conexion.query(
      `INSERT INTO pedido_items
       (id, precio_unitario, pedido_id, producto_id, cantidad_pedida, cantidad_pagada, estado, pedidos_id, productos_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [idItem, precio_unitario, id_pedido, productos_id, cantidad_pedida, 0, 'preparando', id_pedido, productos_id]
    );
    if (insercion.affectedRows !== 1) throw new Error('No se insert? el ?tem.');

    const [descuento] = await conexion.query(
      `UPDATE productos SET cantidad_disponible = cantidad_disponible - ?
       WHERE id = ? AND cantidad_disponible >= ?`,
      [cantidad_pedida, productos_id, cantidad_pedida]
    );
    if (descuento.affectedRows !== 1) throw insuficiente();

    await registrarMovimientoPedido(conexion, pedidos[0], productos_id, -cantidad_pedida, producto.cantidad_disponible);

    await conexion.commit();
    transaccionIniciada = false;
    return res.status(201).json({
      mensaje: '?Producto agregado y stock descontado exitosamente! ??',
      id_item: idItem,
      stock_restante: producto.cantidad_disponible - cantidad_pedida
    });
  } catch (error) {
    return await finalizarTransaccionPedido(conexion, transaccionIniciada, error, res, 'Error al agregar el producto al pedido.');
  } finally {
    await cerrarConexionPedido(conexion);
  }
};

// ==========================================
// 3. CONSULTAR LA CUENTA COMPLETA
// ==========================================
const obtenerPedidoConDetalles = (req, res) => {
  const { id } = req.params;

  const queryPedido = 'SELECT * FROM pedidos WHERE id = ?';
  
  const queryItems = `
    SELECT pi.id, pi.cantidad_pedida, pi.precio_unitario, pi.estado, p.nombre 
    FROM pedido_items pi
    JOIN productos p ON pi.producto_id = p.id OR pi.productos_id = p.id
    WHERE pi.pedido_id = ? OR pi.pedidos_id = ?
  `;

  db.query(queryPedido, [id], (err, resultadosPedido) => {
    if (err) return res.status(500).json({ error: 'Hubo un error al buscar el pedido.' });
    if (resultadosPedido.length === 0) return res.status(404).json({ error: 'Pedido no encontrado.' });

    const pedido = resultadosPedido[0];

    db.query(queryItems, [id, id], (err, resultadosItems) => {
      if (err) return res.status(500).json({ error: 'Hubo un error al buscar los detalles del pedido.' });

      pedido.items = resultadosItems;

      res.json({
        mensaje: 'Detalle de la cuenta cargado con éxito 📋',
        datos: pedido
      });
    });
  });
};

// ==========================================
// 4. CALCULAR CUENTA CONSOLIDADA (PRODUCTOS + JUEGOS)
// ==========================================
const obtenerCuentaConsolidada = (req, res) => {
  // Compatibilidad temporal: la ruta de pedidos recibe el ID de mesa como `id`.
  const mesa_id = req.params.mesa_id ?? req.params.id;

  const queryProductos = `
    SELECT COALESCE(pi.producto_id, pi.productos_id) AS producto_id, 
           p.nombre, pi.cantidad_pedida, pi.precio_unitario, 
           (pi.cantidad_pedida * pi.precio_unitario) AS subtotal
    FROM pedido_items pi
    JOIN productos p ON (pi.producto_id = p.id OR pi.productos_id = p.id)
    JOIN pedidos ped ON (pi.pedido_id = ped.id OR pi.pedidos_id = ped.id)
    WHERE ped.mesas_id = ? AND ped.estado = 'abierto' AND pi.estado != 'cancelado'
  `;

  // El esquema no registra inicio/fin: conservar las claves sin inventar tiempos.
  // costo_tiempo mantiene el contrato y representa el costo_total registrado,
  // no un importe calculado en vivo. NULL indica que aún no hay importe registrado.
  const queryJuegos = `
    SELECT sj.id, sj.activos_juego_id, NULL AS fecha_inicio, NULL AS fecha_fin,
           aj.precio_hora, sj.costo_total AS costo_tiempo
    FROM sesiones_juego sj
    JOIN activos_juego aj ON aj.id = sj.activos_juego_id
    WHERE sj.mesas_id = ? AND sj.estado = 'activa'
  `;

  db.query(queryProductos, [mesa_id], (err, productos) => {
    if (err) {
      console.error('❌ Error al consultar productos:', err.message);
      return res.status(500).json({ error: 'Error al consultar consumos de productos.' });
    }

    db.query(queryJuegos, [mesa_id], (err, juegos) => {
      if (err) {
        console.error('Error al consultar juegos:', err.message);
        return res.status(500).json({ error: 'Error al consultar consumos de juegos.' });
      }

      const totalProductos = (productos || []).reduce((acc, item) => acc + parseFloat(item.subtotal || 0), 0);
      const totalJuegos = (juegos || []).reduce((acc, item) => acc + parseFloat(item.costo_tiempo || 0), 0);
      const totalGeneral = totalProductos + totalJuegos;

      return res.status(200).json({
        exito: true,
        mensaje: 'Cuenta consolidada calculada exitosamente 📊',
        data: {
          mesa_id,
          resumen: {
            subtotal_productos: totalProductos.toFixed(2),
            subtotal_juegos: totalJuegos.toFixed(2),
            total_general: totalGeneral.toFixed(2)
          },
          detalle_productos: productos || [],
          detalle_juegos: juegos || []
        }
      });
    });
  });
};

// ==========================================
// 5. CANCELAR UN ÍTEM DEL PEDIDO Y LIBERAR STOCK
// ==========================================
const cancelarItemPedido = async (req, res) => {
  const { id } = req.params;
  let conexion;
  let transaccionIniciada = false;
  try {
    conexion = mysql.createConnection(db.dbConfig).promise();
    await conexion.beginTransaction();
    transaccionIniciada = true;

    // Descubrir el padre y bloquearlo antes del ítem, como pagos y Kanban.
    const [referencias] = await conexion.query('SELECT pedido_id, pedidos_id FROM pedido_items WHERE id = ?', [id]);
    if (!referencias.length) throw errorPedido(404, 'El ítem especificado no existe.');
    const referencia = referencias[0];
    if (referencia.pedido_id !== referencia.pedidos_id) throw errorPedido(409, 'Referencias de pedido inconsistentes.');
    const [pedidos] = await conexion.query('SELECT id, usuarios_id FROM pedidos WHERE id = ? FOR UPDATE', [referencia.pedido_id]);
    if (!pedidos.length) throw errorPedido(404, 'Pedido no encontrado.');
    const [items] = await conexion.query(
      `SELECT id, pedido_id, pedidos_id, producto_id, productos_id, cantidad_pedida, estado
       FROM pedido_items WHERE id = ? FOR UPDATE`, [id]
    );
    if (!items.length) throw errorPedido(404, 'El ?tem especificado no existe.');
    const item = items[0];
    if (item.pedido_id !== pedidos[0].id || item.pedidos_id !== pedidos[0].id || item.producto_id !== item.productos_id) {
      throw errorPedido(409, 'Referencias del ítem inconsistentes.');
    }
    if (item.estado === 'cancelado') throw errorPedido(400, 'El ?tem ya se encuentra cancelado.');
    if (!Number.isSafeInteger(item.cantidad_pedida) || item.cantidad_pedida <= 0) {
      throw errorPedido(400, 'El ?tem tiene una cantidad inv?lida para reintegrar.');
    }

    const [productos] = await conexion.query(
      'SELECT cantidad_disponible FROM productos WHERE id = ? FOR UPDATE', [item.producto_id]
    );
    if (!productos.length) throw errorPedido(404, 'El producto del ítem no existe.');
    const stock_antes = productos[0].cantidad_disponible;
    if (stock_antes + item.cantidad_pedida > 2147483647) throw errorPedido(409, 'El reintegro excede el rango del inventario.');

    const [cancelacion] = await conexion.query(
      "UPDATE pedido_items SET estado = 'cancelado' WHERE id = ? AND estado != 'cancelado'", [id]
    );
    if (cancelacion.affectedRows !== 1) throw errorPedido(400, 'El ?tem ya se encuentra cancelado.');

    const [reintegro] = await conexion.query(
      'UPDATE productos SET cantidad_disponible = cantidad_disponible + ? WHERE id = ?',
      [item.cantidad_pedida, item.producto_id]
    );
    if (reintegro.affectedRows !== 1) throw errorPedido(404, 'El producto del ?tem no existe.');

    await registrarMovimientoPedido(conexion, pedidos[0], item.producto_id, item.cantidad_pedida, stock_antes);

    await conexion.commit();
    transaccionIniciada = false;
    return res.status(200).json({
      exito: true,
      mensaje: '??tem cancelado con ?xito y stock devuelto al inventario! ??',
      id_item: id,
      cantidad_reintegrada: item.cantidad_pedida
    });
  } catch (error) {
    return await finalizarTransaccionPedido(conexion, transaccionIniciada, error, res, 'Error al cancelar el ?tem.');
  } finally {
    await cerrarConexionPedido(conexion);
  }
};

module.exports = {
  crearPedido,
  agregarItemPedido,
  obtenerPedidoConDetalles,
  obtenerCuentaConsolidada,
  cancelarItemPedido
};
