const db = require('../config/db');

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
// 2. ACTUALIZAR ESTADO DE UN PEDIDO (SIMULADO)
// ==========================================
const actualizarEstadoPedido = async (req, res) => {
  const { id } = req.params;
  const { nuevo_estado } = req.body;

  const estadosValidos = ['pendiente', 'en_preparacion', 'entregado', 'cancelado'];

  if (!nuevo_estado || !estadosValidos.includes(nuevo_estado)) {
    return res.status(400).json({ 
      error: 'El campo nuevo_estado es obligatorio y debe ser: pendiente, en_preparacion, entregado o cancelado.' 
    });
  }

  res.json({
    mensaje: `¡Pedido ${id} movido con éxito a: ${nuevo_estado.toUpperCase()}! 🚚💨`,
    pedido_id: id,
    estado_actual: nuevo_estado
  });
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