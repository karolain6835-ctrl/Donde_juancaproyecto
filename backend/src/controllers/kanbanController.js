const { ejecutor } = require('../services/identidadService');
const db = require('../config/db');
const mysql = require('mysql2');
const crypto = require('crypto');

// ==========================================
// 1. OBTENER PEDIDOS SIMULADOS
// ==========================================
const obtenerPedidosKanban = async (req, res) => {
  const pedidosKanban = [
    {
      id: "PED-101",
      mesa: "Mesa 3",
      items: "2 Cervezas Club Colombia",
      estado: "pendiente",
      hora_pedido: "15:45"
    },
    {
      id: "PED-102",
      mesa: "Mesa 1 (Tejo)",
      items: "1 Porción de Chicharrón, 1 Aguardiente",
      estado: "en_preparacion",
      hora_pedido: "15:30"
    },
    {
      id: "PED-103",
      mesa: "Mesa 5",
      items: "1 Gaseosa Coca-Cola",
      estado: "entregado",
      hora_pedido: "15:15"
    }
  ];

  res.json({
    mensaje: "Pedidos para el tablero Kanban cargados con éxito. 📋",
    total: pedidosKanban.length,
    pedidos: pedidosKanban
  });
};

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
      catch (errorRollback) { console.error('Error al revertir movimiento Kanban:', errorRollback.message); }
    }
    console.error('Error al mover tarjeta Kanban:', error.message);
    return res.status(error.status || 500).json({
      error: error.status ? error.message : 'Error al actualizar la tarjeta del Kanban.'
    });
  } finally {
    if (conexion) {
      try { await conexion.end(); }
      catch (errorConexion) { console.error('Error al cerrar conexión Kanban:', errorConexion.message); }
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
      console.error('❌ Error al obtener tablero Kanban:', err.message);
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
module.exports = {
  obtenerPedidosKanban,
  actualizarEstadoPedido,
  obtenerTableroKanban
};
