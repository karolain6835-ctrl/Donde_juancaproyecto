// 1. Crear un nuevo pedido/orden de consumo (Simulado)
exports.crearPedido = async (req, res) => {
  const { mesa_id, cliente_id, items } = req.body;

  if (!mesa_id || !items || items.length === 0) {
    return res.status(400).json({ error: 'Debes indicar la mesa_id y al menos un producto en items.' });
  }

  res.status(201).json({
    mensaje: "¡Pedido registrado con éxito en la mesa! 📝🍻",
    pedido_id: "PED-999",
    mesa_id,
    cliente_id: cliente_id || "Consumidor Final",
    items_registrados: items.length
  });
};

// 2. Generar Factura y Procesar Pago (Simulado)
exports.generarFactura = async (req, res) => {
  const { pedido_id, metodo_pago } = req.body;

  if (!pedido_id || !metodo_pago) {
    return res.status(400).json({ error: 'El pedido_id y el metodo_pago (efectivo/tarjeta/nequi) son obligatorios.' });
  }

  // Simulamos el cálculo y cierre de la cuenta
  const subtotal = 45000;
  const servicio = subtotal * 0.10; // 10% opcional de propina/servicio
  const total = subtotal + servicio;

  res.json({
    mensaje: "¡Cuenta liquidada! Factura generada con éxito. 💵🧾",
    factura: {
      numero_factura: "FAC-2026-001",
      pedido_id,
      subtotal,
      servicio,
      total,
      metodo_pago,
      estado_pago: "Pagado ✅",
      fecha_emision: new Date()
    }
  });
};