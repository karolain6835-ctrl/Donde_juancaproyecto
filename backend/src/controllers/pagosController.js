const db = require('../config/db');

// Registrar un nuevo pago para una cuenta/pedido
exports.registrarPago = async (req, res) => {
  const { id, metodo_de_pago, total_seleccionado, pedidos_id, usuarios_id } = req.body;

  // Validaciones básicas de campos obligatorios según tu BD
  if (!id || !metodo_de_pago || !total_seleccionado || !pedidos_id || !usuarios_id) {
    return res.status(400).json({ error: 'Todos los campos son obligatorios (id, metodo_de_pago, total_seleccionado, pedidos_id, usuarios_id).' });
  }

  try {
    // 1. Insertar el registro en la tabla pagos usando .promise() para que funcione con await
    const queryPago = `
      INSERT INTO pagos (id, metodo_de_pago, total_seleccionado, verificacion_estado, estado, origen, creado_en, pedidos_id, usuarios_id)
      VALUES (?, ?, ?, 'pendiente', 'pendiente', 'mesera', NOW(), ?, ?)
    `;

    // AGREGAMOS .promise() AQUÍ
    await db.promise().query(queryPago, [id, metodo_de_pago, total_seleccionado, pedidos_id, usuarios_id]);

    // 2. Actualizar el estado del pedido a 'cerrado' para liberar la mesa
    const queryPedido = `UPDATE pedidos SET estado = 'cerrado' WHERE id = ?`;
    
    // AGREGAMOS .promise() AQUÍ TAMBIÉN
    await db.promise().query(queryPedido, [pedidos_id]);

    res.status(201).json({
      mensaje: '¡Pago registrado con éxito y cuenta de la mesa cerrada! 💸',
      id_pago: id
    });

  } catch (error) {
    console.error('❌ Error al procesar el pago:', error);
    res.status(500).json({ error: 'Hubo un error interno al registrar el pago.', detalles: error.message });
  }
};

// Consultar el estado de un pago específico
exports.obtenerPagoPorId = async (req, res) => {
  const { id } = req.params;

  try {
    // AGREGAMOS .promise() AQUÍ
    const [rows] = await db.promise().query('SELECT * FROM pagos WHERE id = ?', [id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'El registro de pago no existe.' });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error('❌ Error al obtener el pago:', error);
    res.status(500).json({ error: 'Error al consultar el pago.' });
  }
};