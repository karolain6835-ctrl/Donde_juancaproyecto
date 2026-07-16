// 1. Actualizar el stock de un producto (Simulado para desarrollo ágil)
exports.actualizarStock = async (req, res) => {
  const { producto_id, nueva_cantidad } = req.body;

  if (!producto_id || nueva_cantidad === undefined) {
    return res.status(400).json({ error: 'El producto_id y la nueva_cantidad son obligatorios.' });
  }

  // Simulamos la actualización exitosa en el inventario
  res.json({
    mensaje: `¡Inventario actualizado con éxito! Producto [${producto_id}] ahora tiene ${nueva_cantidad} unidades.`,
    producto_id,
    stock_actual: nueva_cantidad
  });
};

// 2. Obtener alertas de stock bajo activas (Simulado para desarrollo ágil)
exports.obtenerAlertas = async (req, res) => {
  // Simulamos un listado de productos que ya cruzaron el stock mínimo en el bar
  const alertasSimuladas = [
    {
      id: "ALERT-001",
      producto: "Cerveza Club Colombia Dorada",
      stock_actual: 5,
      stock_minimo: 24,
      mensaje: "¡Alerta Crítica! Quedan pocas unidades para el fin de semana.",
      fecha: new Date()
    },
    {
      id: "ALERT-002",
      producto: "Aguardiente Antioqueño 750ml",
      stock_actual: 2,
      stock_minimo: 6,
      mensaje: "Stock por debajo del límite permitido.",
      fecha: new Date()
    }
  ];

  res.json({
    mensaje: "Alertas de inventario consultadas con éxito.",
    total_alertas: alertasSimuladas.length,
    alertas: alertasSimuladas
  });
};