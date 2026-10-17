const { ejecutor } = require('../services/identidadService');
const db = require('../config/db');
const mysql = require('mysql2');
const crypto = require('crypto');

// ==========================================
// 2. MOVER UN ÍTEM REAL Y REGISTRAR SU ESTADO ANTERIOR
// ==========================================
const actualizarEstadoPedido = async (req, res) => {
  const { id } = req.params;
  const usuarios_id = ejecutor(req, res);
  if (!usuarios_id) return;
  const { nuevo_estado } = req.body || {};
  // La lectura del tablero llama "preparacion" a la columna "preparando".
  const estadoDestino = nuevo_estado === 'preparacion' ? 'preparando' : nuevo_estado;
  if (!['enviado', 'preparando', 'servido'].includes(estadoDestino)) {
    return res.status(400).json({
      error: 'nuevo_estado debe ser enviado, preparando o servido. La cancelación utiliza /api/pedidos/items/:id/cancelar.'
    });
  }
  if (typeof usuarios_id !== 'string' || !usuarios_id.trim()) {
    return res.status(400).json({ error: 'usuarios_id es obligatorio para registrar el movimiento.' });
  }

  let conexion;
  let transaccionIniciada = false;
  const rechazar = (status, mensaje) => { throw Object.assign(new Error(mensaje), { status }); };
  try {
    conexion = mysql.createConnection(db.dbConfig).promise();
    await conexion.beginTransaction();
    transaccionIniciada = true;
    const [ubicacion] = await conexion.query(
      'SELECT pedido_id, pedidos_id FROM pedido_items WHERE id = ?', [id]
    );
    if (!ubicacion.length) rechazar(404, 'La tarjeta no existe.');
    if (ubicacion[0].pedido_id !== ubicacion[0].pedidos_id) {
      rechazar(409, 'Las referencias al pedido de la tarjeta son inconsistentes.');
    }
    // Mismo orden pedido -> ítem que liquidación; no mover un pedido cerrado.
    const [pedidos] = await conexion.query(
      'SELECT id, estado FROM pedidos WHERE id = ? FOR UPDATE', [ubicacion[0].pedidos_id]
    );
    if (!pedidos.length || pedidos[0].estado !== 'abierto') {
      rechazar(409, 'La tarjeta debe pertenecer a un pedido abierto.');
    }
    const [items] = await conexion.query('SELECT * FROM pedido_items WHERE id = ? FOR UPDATE', [id]);
    if (!items.length) rechazar(404, 'La tarjeta no existe.');
    const item = items[0];
    if (item.pedidos_id !== pedidos[0].id || item.pedido_id !== pedidos[0].id ||
        item.producto_id !== item.productos_id) {
      rechazar(409, 'Las relaciones de la tarjeta cambiaron o son inconsistentes.');
    }
    // Secuencia ofrecida por los botones existentes de KanbanPage.
    const siguiente = { enviado: 'preparando', preparando: 'servido' };
    if (siguiente[item.estado] !== estadoDestino) {
      rechazar(400, 'Transición inválida. Solo se permite enviado → preparando → servido.');
    }
    const [usuarios] = await conexion.query('SELECT id FROM usuarios WHERE id = ?', [usuarios_id]);
    if (!usuarios.length) rechazar(400, 'El usuario indicado no existe.');

    const [actualizacion] = await conexion.query(
      'UPDATE pedido_items SET estado = ? WHERE id = ? AND estado = ?',
      [estadoDestino, id, item.estado]
    );
    if (actualizacion.affectedRows !== 1 || actualizacion.changedRows !== 1) {
      rechazar(409, 'MySQL no modificó el estado de la tarjeta.');
    }
    const [movimiento] = await conexion.query(`
      INSERT INTO kanban_movimientos (id, estado_anterior, creado_en, pedido_items_id, usuarios_id)
      VALUES (?, ?, NOW(), ?, ?)
    `, [crypto.randomUUID(), item.estado, id, usuarios_id]);
    if (movimiento.affectedRows !== 1) throw new Error('No se registró el movimiento de la tarjeta.');

    const [tarjetas] = await conexion.query(`
      SELECT pi.id AS id_item, ped.id AS id_pedido, m.numero AS mesa,
             p.nombre AS producto, pi.cantidad_pedida AS cantidad,
             pi.cantidad_pagada, ped.creado_en AS hora, pi.estado AS estado_item
      FROM pedido_items pi
      JOIN productos p ON pi.productos_id = p.id
      JOIN pedidos ped ON pi.pedidos_id = ped.id
      JOIN mesas m ON ped.mesas_id = m.id
      WHERE pi.id = ?
    `, [id]);
    if (tarjetas.length !== 1 || tarjetas[0].estado_item !== estadoDestino) {
      throw new Error('No se pudo recuperar la tarjeta actualizada.');
    }
    await conexion.commit();
    transaccionIniciada = false;
    return res.status(200).json({
      mensaje: `¡Ítem ${id} movido con éxito a: ${estadoDestino.toUpperCase()}!`,
      pedido_id: tarjetas[0].id_pedido,
      estado_actual: tarjetas[0].estado_item,
      tarjeta: tarjetas[0]
    });
  } catch (error) {
    if (transaccionIniciada) {
      try { await conexion.rollback(); }
      catch (errorRollback) { console.error('Error al revertir movimiento Kanban:', new Error('Fallo interno; detalles sensibles omitidos.').stack); }
    }
    console.error('Error al mover tarjeta Kanban:', new Error('Fallo interno; detalles sensibles omitidos.').stack);
    return res.status(error.status || 500).json({
      error: error.status ? error.message : 'Error al actualizar la tarjeta del Kanban.'
    });
  } finally {
    if (conexion) {
      try { await conexion.end(); }
      catch (errorConexion) { console.error('Error al cerrar conexión Kanban:', new Error('Fallo interno; detalles sensibles omitidos.').stack); }
    }
  }
};

// ==========================================
// 3. OBTENER TABLERO REAL DE LA BASE DE DATOS
// ==========================================
const obtenerTableroKanban = (req, res) => {
  const query = `
    SELECT 
      pi.id AS item_id,
      pi.cantidad_pedida,
      pi.estado AS estado_item,
      p.nombre AS producto_nombre,
      ped.id AS pedido_id,
      m.numero AS numero_mesa,
      ped.creado_en
    FROM pedido_items pi
    JOIN productos p ON (pi.producto_id = p.id OR pi.productos_id = p.id)
    JOIN pedidos ped ON (pi.pedido_id = ped.id OR pi.pedidos_id = ped.id)
    JOIN mesas m ON ped.mesas_id = m.id
    WHERE pi.estado IN ('enviado', 'preparacion', 'preparando', 'servido')
      AND ped.estado = 'abierto'
    ORDER BY ped.creado_en ASC
  `;

  db.query(query, (err, resultados) => {
    if (err) {
      console.error('❌ Error al obtener tablero Kanban:', new Error('Fallo interno; detalles sensibles omitidos.').stack);
      return res.status(500).json({ error: 'Error al cargar el tablero de cocina.' });
    }

    const tablero = {
      enviado: [],
      preparacion: [],
      servido: []
    };

    resultados.forEach((item) => {
      const estadoNormalizado = item.estado_item === 'preparando' ? 'preparacion' : item.estado_item;

      const tarjeta = {
        id_item: item.item_id,
        id_pedido: item.pedido_id,
        mesa: item.numero_mesa,
        producto: item.producto_nombre,
        cantidad: item.cantidad_pedida,
        hora: item.creado_en
      };

      if (tablero[estadoNormalizado]) {
        tablero[estadoNormalizado].push(tarjeta);
      }
    });

    return res.status(200).json({
      exito: true,
      mensaje: 'Tablero Kanban cargado exitosamente 📋',
      data: tablero
    });
  });
};

// ==========================================
// EXPORTAR TODAS LAS FUNCIONES AL FINAL
// ==========================================
const cambiarLineasPedido = async (req, res, despacho = false) => {
  const actor = ejecutor(req, res);
  if (!actor) return;
  const { id } = req.params;
  if (typeof id !== 'string' || !id.trim() || id !== id.trim() || id.length > 36 ||
      (req.body !== undefined && (!req.body || typeof req.body !== 'object' || Array.isArray(req.body) || Object.keys(req.body).length))) {
    return res.status(400).json({ error: 'ID o body de aceptación inválido. No envíes actor ni estados.' });
  }
  let conexion, abierta = false;
  const reject = (status, message) => { throw Object.assign(new Error(message), { status }); };
  try {
    conexion = mysql.createConnection(db.dbConfig).promise();
    await conexion.beginTransaction(); abierta = true;
    const [[pedido]] = await conexion.query('SELECT id,estado FROM pedidos WHERE id=? FOR UPDATE', [id]);
    if (!pedido) reject(404, 'Pedido no encontrado.');
    if (pedido.estado !== 'abierto') reject(409, 'Solo se pueden aceptar pedidos abiertos.');
    const [items] = await conexion.query('SELECT id,pedido_id,pedidos_id,producto_id,productos_id,estado FROM pedido_items WHERE pedido_id=? OR pedidos_id=? ORDER BY id FOR UPDATE', [id, id]);
    if (items.some(item => item.pedido_id !== pedido.id || item.pedidos_id !== pedido.id || item.producto_id !== item.productos_id)) reject(409, 'Referencias de ítems inconsistentes.');
    if (despacho && items.some(item => item.estado === 'enviado')) reject(409, 'Primero debes aceptar el pedido: todavía hay líneas enviadas.');
    const [usuarios] = await conexion.query('SELECT id FROM usuarios WHERE id = ?', [actor]);
    if (!usuarios.length) reject(409, 'El ejecutor no existe.');
    const anterior = despacho ? 'preparando' : 'enviado';
    const destino = despacho ? 'servido' : 'preparando';
    const enviados = items.filter(item => item.estado === anterior);
    for (const item of enviados) {
      const [update] = await conexion.query('UPDATE pedido_items SET estado=? WHERE id=? AND estado=?', [destino, item.id, anterior]);
      if (update.affectedRows !== 1 || update.changedRows !== 1) reject(409, 'El estado del ítem cambió durante la aceptación.');
      const [history] = await conexion.query('INSERT INTO kanban_movimientos (id,estado_anterior,creado_en,pedido_items_id,usuarios_id) VALUES (?, ?, NOW(), ?, ?)', [crypto.randomUUID(), anterior, item.id, actor]);
      if (history.affectedRows !== 1) throw new Error('No se registró la aceptación.');
    }
    await conexion.commit(); abierta = false;
    return res.json({ mensaje: despacho ? 'Despacho confirmado.' : enviados.length ? 'Pedido aceptado correctamente.' : 'El pedido no tiene líneas enviadas pendientes de aceptar.', pedido_id: pedido.id, [despacho ? 'items_despachados' : 'items_aceptados']: enviados.length });
  } catch (error) {
    if (abierta) { try { await conexion.rollback(); } catch (rollback) { console.error('Rollback aceptación:', new Error('Fallo interno; detalles sensibles omitidos.').stack); } }
    const concurrent = ['ER_LOCK_DEADLOCK', 'ER_LOCK_WAIT_TIMEOUT'].includes(error.code);
    return res.status(error.status || (concurrent ? 409 : 500)).json({ error: error.status ? error.message : concurrent ? 'Conflicto concurrente. Reintenta la aceptación.' : 'No se pudo aceptar el pedido.' });
  } finally { if (conexion) { try { await conexion.end(); } catch (error) { console.error('Cierre aceptación:', new Error('Fallo interno; detalles sensibles omitidos.').stack); } } }
};
const aceptarPedido = (req, res) => cambiarLineasPedido(req, res);
const despacharTodo = (req, res) => cambiarLineasPedido(req, res, true);

const estadoDerivado = items => {
  // Canceladas no cuentan. Todas enviadas => enviado; todas servidas => servido.
  // Alguna servida y alguna pendiente => parcialmente_servido.
  // Sin servidas y con alguna preparando (incluso mezclada con enviado) => preparando.
  // Sin líneas operativas => no hay tarjeta. Nunca se persiste este estado en pedidos.
  const activos = items.filter(item => item.estado !== 'cancelado');
  if (!activos.length) return null;
  if (activos.every(item => item.estado === 'enviado')) return 'enviado';
  if (activos.every(item => item.estado === 'servido')) return 'servido';
  if (activos.some(item => item.estado === 'servido')) return 'parcialmente_servido';
  return 'preparando';
};
const obtenerPedidosAgrupados = (req, res) => {
  db.query(`SELECT ped.id AS pedido_id,m.numero AS mesa,ped.usuarios_id AS responsable_id,u.nombre AS responsable,
    ped.creado_en,pi.id AS pedido_item_id,p.nombre AS producto,pi.cantidad_pedida,pi.estado
    FROM pedidos ped JOIN pedido_items pi ON pi.pedidos_id=ped.id
    LEFT JOIN mesas m ON m.id=ped.mesas_id LEFT JOIN usuarios u ON u.id=ped.usuarios_id
    LEFT JOIN productos p ON p.id=pi.productos_id
    WHERE ped.estado='abierto' ORDER BY ped.creado_en,ped.id,pi.id`, (error, rows) => {
    if (error) return res.status(500).json({ error: 'No se pudo consultar el Kanban por pedidos.' });
    const pedidos = new Map();
    for (const row of rows) {
      if (!pedidos.has(row.pedido_id)) pedidos.set(row.pedido_id, { pedido_id: row.pedido_id, mesa: row.mesa,
        responsable_id: row.responsable_id, responsable: row.responsable, creado_en: row.creado_en, items: [] });
      pedidos.get(row.pedido_id).items.push({ pedido_item_id: row.pedido_item_id, producto: row.producto,
        cantidad_pedida: row.cantidad_pedida, estado: row.estado });
    }
    const datos = [...pedidos.values()].map(pedido => ({ ...pedido, estado_derivado: estadoDerivado(pedido.items) })).filter(pedido => pedido.estado_derivado !== null);
    return res.json({ datos });
  });
};

module.exports = {
  obtenerPedidosAgrupados,
  despacharTodo,
  estadoDerivado,
  aceptarPedido,
  actualizarEstadoPedido,
  obtenerTableroKanban
};
