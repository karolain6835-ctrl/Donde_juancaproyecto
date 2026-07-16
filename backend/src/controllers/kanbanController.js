// 1. Obtener todos los pedidos destinados al tablero Kanban (Simulado)
exports.obtenerPedidosKanban = async (req, res) => {
  // Simulamos una lista de pedidos con diferentes estados de preparación
  const pedidosKanban = [
    {
      id: "PED-101",
      mesa: "Mesa 3",
      items: "2 Cervezas Club Colombia",
      estado: "pendiente", // Columna 1
      hora_pedido: "15:45"
    },
    {
      id: "PED-102",
      mesa: "Mesa 1 (Tejo)",
      items: "1 Porción de Chicharrón, 1 Aguardiente",
      estado: "en_preparacion", // Columna 2
      hora_pedido: "15:30"
    },
    {
      id: "PED-103",
      mesa: "Mesa 5",
      items: "1 Gaseosa Coca-Cola",
      estado: "entregado", // Columna 3
      hora_pedido: "15:15"
    }
  ];

  res.json({
    mensaje: "Pedidos para el tablero Kanban cargados con éxito. 📋",
    total: pedidosKanban.length,
    pedidos: pedidosKanban
  });
};

// 2. Actualizar el estado de un pedido en el Kanban (Simulado)
exports.actualizarEstadoPedido = async (req, res) => {
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