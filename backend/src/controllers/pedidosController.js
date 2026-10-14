const { ejecutor } = require('../services/identidadService');
const db = require('../config/db');
const mysql = require('mysql2');
const crypto = require('crypto'); // Generador de UUIDs
const { insertarParticipante, validarParticipante } = require('../services/participantesService');
const { asegurarSesion, bloquearAmbitoPedido, validarSesionPedido } = require('../services/sesionesMesaService');

// Lectura paginada: permite consultar también pedidos sin ítems, ausentes de Kanban.
const listarPedidos = (req, res) => {
  const q = req.query || {};
  const estados = ['abierto', 'cerrado', 'cancelado'];
  const entero = (value, fallback) => value === undefined ? fallback : typeof value === 'string' && /^[1-9]\d*$/.test(value) ? Number(value) : NaN;
  const pagina = entero(q.pagina, 1), limite = entero(q.limite, 20), offset = (pagina - 1) * limite;
  if (Object.keys(q).some(k => !['pagina', 'limite', 'estado', 'mesas_id'].includes(k)) ||
      !Number.isSafeInteger(pagina) || !Number.isSafeInteger(limite) || limite > 100 || !Number.isSafeInteger(offset) ||
      (q.estado !== undefined && !estados.includes(q.estado)) ||
      (q.mesas_id !== undefined && (typeof q.mesas_id !== 'string' || !q.mesas_id.trim() || q.mesas_id.length > 36 || q.mesas_id !== q.mesas_id.trim()))) {
    return res.status(400).json({ error: 'Filtros o paginación de pedidos inválidos.' });
  }
  const filters = [], params = [];
  for (const key of ['estado', 'mesas_id']) if (q[key] !== undefined) { filters.push(`ped.${key}=?`); params.push(q[key]); }
  const where = filters.length ? ` WHERE ${filters.join(' AND ')}` : '';
  db.query(`SELECT COUNT(*) AS total FROM pedidos ped${where}`, params, (error, counts) => {
    if (error) return res.status(500).json({ error: 'No se pudieron consultar los pedidos.' });
    db.query(`SELECT ped.id,ped.estado,ped.creado_en,ped.mesas_id,ped.usuarios_id,ped.clientes_id,
      m.numero AS mesa_numero,c.nombre AS cliente_nombre,u.nombre AS responsable_nombre
      FROM pedidos ped LEFT JOIN mesas m ON m.id=ped.mesas_id
      LEFT JOIN clientes c ON c.id=ped.clientes_id LEFT JOIN usuarios u ON u.id=ped.usuarios_id
      ${where} ORDER BY ped.creado_en DESC,ped.id DESC LIMIT ? OFFSET ?`, [...params, limite, offset], (error, datos) => {
      if (error) return res.status(500).json({ error: 'No se pudieron consultar los pedidos.' });
      const total = Number(counts[0].total);
      return res.json({ datos, paginacion: { pagina, limite, total, total_paginas: Math.ceil(total / limite) } });
    });
  });
};

// ==========================================
// 1. CREAR UN NUEVO PEDIDO
// ==========================================
const crearPedido = async (req, res) => {
  const actor = ejecutor(req, res, []);
  if (!actor) return;
  const { mesas_id, usuarios_id, clientes_id = null, participante_id } = req.body || {};

  if (!mesas_id || !usuarios_id || clientes_id === '' || (clientes_id === null && !req.body?.participante_temporal && !participante_id)) {
    return res.status(400).json({ 
      error: "Faltan datos. Se requiere la mesa, el usuario que atiende y el cliente." 
    });
  }
  if (['Mesero', 'Mesera'].includes(req.usuario.rol) && usuarios_id !== actor) {
    return res.status(403).json({ error: 'Solo puedes crear pedidos con tu propio usuario como responsable.' });
  }

  let conexion, abierta = false;
  const rechazar = (status, message) => { throw Object.assign(new Error(message), { status }); };
  try {
    conexion = mysql.createConnection(db.dbConfig).promise();
    await conexion.beginTransaction(); abierta = true;
    const [[mesa]] = await conexion.query('SELECT id,estado FROM mesas WHERE id=? FOR UPDATE', [mesas_id]);
    if (!mesa) rechazar(404, 'Mesa no encontrada.');
    if (clientes_id !== null) {
      const [clientes] = await conexion.query('SELECT estado FROM clientes WHERE id = ? LOCK IN SHARE MODE', [clientes_id]);
      if (!clientes.length) rechazar(404, 'El cliente especificado no existe.');
      if (clientes[0].estado !== 'activo') rechazar(409, 'No puede asociarse un pedido a un cliente inactivo.');
    } else if (!participante_id) validarParticipante({ tipo_participante: 'temporal', nombre: req.body.participante_temporal?.nombre });
    const [responsables] = await conexion.query('SELECT id,estado FROM usuarios WHERE id = ? LOCK IN SHARE MODE', [usuarios_id]);
    if (!responsables.length) rechazar(404, 'Responsable no encontrado.');
    if (responsables[0].estado !== 'activo') rechazar(409, 'El responsable del pedido debe estar activo.');
    const sesion = await asegurarSesion(conexion, mesa.id);
    if (participante_id) {
      if (typeof participante_id !== 'string' || participante_id.length > 36 || req.body.participante_temporal) rechazar(400, 'Participante existente inválido.');
      const [[person]] = await conexion.query('SELECT id,clientes_id FROM jugadores WHERE id=? AND sesion_mesa_id=? FOR UPDATE', [participante_id, sesion.id]);
      if (!person) rechazar(409, 'El participante no pertenece a la visita activa de esta mesa.');
      if (clientes_id !== null && person.clientes_id !== clientes_id) rechazar(400, 'El cliente no corresponde al participante seleccionado.');
      if (person.clientes_id) await insertarParticipante(conexion, { mesas_id: mesa.id, sesion_mesa_id: sesion.id }, { tipo_participante: 'registrado', clientes_id: person.clientes_id }, true);
    }
    const id = crypto.randomUUID();
    const fechaActual = new Date(); fechaActual.setHours(fechaActual.getHours() - 5);
    const creado_en = fechaActual.toISOString().slice(0, 19).replace('T', ' ');
    const [insert] = await conexion.query('INSERT INTO pedidos (id,estado,sincronizado,creado_en,mesas_id,usuarios_id,clientes_id,sesion_mesa_id) VALUES (?,?,?,?,?,?,?,?)', [id,'abierto',0,creado_en,mesa.id,usuarios_id,clientes_id,sesion.id]);
    if (insert.affectedRows !== 1) throw new Error('No se insertó el pedido.');
    if (!participante_id) await insertarParticipante(conexion, { id, mesas_id: mesa.id, sesion_mesa_id: sesion.id }, clientes_id === null
      ? { tipo_participante: 'temporal', nombre: req.body.participante_temporal.nombre }
      : { tipo_participante: 'registrado', clientes_id }, true);
    if (mesa.estado === 'disponible') {
      const [update] = await conexion.query("UPDATE mesas SET estado='ocupada' WHERE id=?", [mesa.id]);
      if (update.affectedRows !== 1) throw new Error('No se ocupó la mesa.');
    }
    await conexion.commit(); abierta = false;
    return res.status(201).json({ mensaje: '¡Cuenta abierta con éxito para la mesa! 🍻', id_pedido: id });
  } catch (error) {
    if (abierta) { try { await conexion.rollback(); } catch (rollback) { console.error('Rollback pedido:', rollback.message); } }
    const concurrent = ['ER_LOCK_DEADLOCK','ER_LOCK_WAIT_TIMEOUT'].includes(error.code);
    return res.status(error.status || (concurrent ? 409 : 500)).json({ error: error.status ? error.message : concurrent ? 'Conflicto concurrente al ocupar la mesa. Reintenta.' : 'Hubo un error en el servidor al abrir el pedido.' });
  } finally { if (conexion) { try { await conexion.end(); } catch (error) { console.error('Cierre pedido:', error.message); } } }
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

const agregarItemPedido = async (req, res) => {
  const actor = ejecutor(req, res);
  if (!actor) return;
  const { id_pedido } = req.params;
  const { productos_id, cantidad_pedida, precio_unitario, participante_id = null } = req.body || {};

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

    const pedidos = [await bloquearAmbitoPedido(conexion, id_pedido)];
    await validarSesionPedido(conexion, pedidos[0]);
    if (participante_id !== null) {
      if (typeof participante_id !== 'string' || !participante_id.trim() || participante_id.length > 36) throw errorPedido(400, 'Participante inválido.');
      const columna = pedidos[0].sesion_mesa_id ? 'sesion_mesa_id' : 'pedido_id';
      const [[participante]] = await conexion.query(`SELECT id FROM jugadores WHERE id=? AND ${columna}=? FOR UPDATE`, [participante_id, pedidos[0].sesion_mesa_id || id_pedido]);
      if (!participante) throw errorPedido(409, 'El participante no pertenece a la visita o pedido.');
    }
    // El bloqueo del padre serializa también dos altas concurrentes sin línea previa.
    const [compatibles] = await conexion.query(`SELECT id,cantidad_pedida,pedido_id,producto_id
      FROM pedido_items WHERE pedidos_id=? AND productos_id=? AND precio_unitario=?
      AND participante_id <=> ? AND estado IN ('enviado','preparando') ORDER BY id LIMIT 1 FOR UPDATE`,
    [id_pedido, productos_id, precio_unitario, participante_id]);
    const compatible = compatibles[0];
    if (compatible && (compatible.pedido_id !== pedidos[0].id || compatible.producto_id !== productos_id)) {
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
       (id, precio_unitario, pedido_id, producto_id, cantidad_pedida, cantidad_pagada, estado, pedidos_id, productos_id, participante_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [idItem, precio_unitario, id_pedido, productos_id, cantidad_pedida, 0, 'enviado', id_pedido, productos_id, participante_id]
    );
    if (insercion.affectedRows !== 1) throw new Error('No se insert? el ?tem.');
    }

    const [descuento] = await conexion.query(
      `UPDATE productos SET cantidad_disponible = cantidad_disponible - ?
       WHERE id = ? AND cantidad_disponible >= ?`,
      [cantidad_pedida, productos_id, cantidad_pedida]
    );
    if (descuento.affectedRows !== 1) throw insuficiente();

    await registrarMovimientoPedido(conexion, pedidos[0], productos_id, -cantidad_pedida, producto.cantidad_disponible, actor);

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
    SELECT pi.id, pi.cantidad_pedida, pi.precio_unitario, pi.estado, p.nombre, pi.participante_id, j.nombre AS participante_nombre
    FROM pedido_items pi
    JOIN productos p ON pi.producto_id = p.id OR pi.productos_id = p.id
    LEFT JOIN jugadores j ON j.id=pi.participante_id
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
  const actor = ejecutor(req, res);
  if (!actor) return;
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
    if (item.estado === 'servido') throw errorPedido(409, 'No se puede cancelar una línea ya servida. Se requiere un flujo de devolución.');
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

    await registrarMovimientoPedido(conexion, pedidos[0], item.producto_id, item.cantidad_pedida, stock_antes, actor);

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
  listarPedidos,
  crearPedido,
  agregarItemPedido,
  obtenerPedidoConDetalles,
  obtenerCuentaConsolidada,
  cancelarItemPedido
};
