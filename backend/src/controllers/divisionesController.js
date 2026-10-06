const db = require('../config/db');

// ==========================================
// 1. INICIAR SESIÓN DE DIVISIÓN DE CUENTA
// ==========================================
const iniciarSesionDivision = (req, res) => {
  const { mesas_id, usuarios_id, modalidad } = req.body;

  // Validación de campos obligatorios
  if (!mesas_id || !usuarios_id || !modalidad) {
    return res.status(400).json({ 
      error: 'Faltan parámetros obligatorios: mesas_id, usuarios_id o modalidad.' 
    });
  }

  // 1. Verificar si la mesa existe
  const queryMesa = `SELECT id, estado FROM mesas WHERE id = ?`;

  db.query(queryMesa, [mesas_id], (err, resultadosMesa) => {
    if (err) {
      console.error('❌ Error al consultar la mesa:', err.message);
      return res.status(500).json({ error: 'Error interno al verificar la mesa.' });
    }

    if (resultadosMesa.length === 0) {
      return res.status(404).json({ error: 'La mesa especificada no existe.' });
    }

    // Generar ID único para la sesión de división
    const idDivision = `div-${Date.now()}`;

    // 2. Registrar la sesión en la tabla `sesiones_division_cuentas`
    const queryInsert = `
      INSERT INTO sesiones_division_cuentas (id, modalidad, usuarios_id, mesas_id)
      VALUES (?, ?, ?, ?)
    `;

    db.query(queryInsert, [idDivision, modalidad, usuarios_id, mesas_id], (errInsert) => {
      if (errInsert) {
        console.error('❌ Error al registrar la sesión de división:', errInsert.message);
        return res.status(500).json({ error: 'Error al guardar la sesión de división en la base de datos.' });
      }

      return res.status(201).json({
        exito: true,
        mensaje: 'Sesión de división iniciada con éxito 🍕',
        data: {
          id: idDivision,
          modalidad,
          usuarios_id,
          mesas_id
        }
      });
    });
  });
};

// ==========================================
// 2. ASIGNAR ÍTEMS A UN CLIENTE EN LA DIVISIÓN
// ==========================================
const asignarItemsACliente = (req, res) => {
  const { id: sesion_division_id } = req.params;
  const { nombre_cliente, items } = req.body;

  if (!nombre_cliente || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      error: 'Parámetros incompletos. Se requiere nombre_cliente y un arreglo de items con { pedido_item_id, cantidad, precio_unitario }.'
    });
  }

  // 1. Validar existencia de la sesión de división
  const querySesion = 'SELECT id, modalidad, mesas_id FROM sesiones_division_cuentas WHERE id = ?';
  db.query(querySesion, [sesion_division_id], (errSesion, resSesion) => {
    if (errSesion) {
      console.error('❌ Error al verificar sesión:', errSesion.message);
      return res.status(500).json({ error: 'Error al consultar la sesión.', detalles: errSesion.message });
    }

    if (resSesion.length === 0) {
      return res.status(404).json({ error: 'La sesión de división no existe.' });
    }

    const participanteId = `part-${Date.now()}`;
    let totalAsignado = 0;

    const itemsProcesados = items.map((item, index) => {
      const cantidad = parseInt(item.cantidad, 10) || 1;
      const precio = parseFloat(item.precio_unitario) || 0;
      const subtotal = cantidad * precio;
      totalAsignado += subtotal;

      return [
        `det-${Date.now()}-${index}`,
        participanteId,
        item.pedido_item_id,
        cantidad,
        subtotal
      ];
    });

    // 2. Registrar el participante
    const sqlParticipante = `
      INSERT INTO division_participantes (id, sesion_division_id, nombre_cliente, total_asignado)
      VALUES (?, ?, ?, ?)
    `;

    db.query(sqlParticipante, [participanteId, sesion_division_id, nombre_cliente, totalAsignado], (errPart) => {
      if (errPart) {
        console.error('❌ Error al guardar participante:', errPart.message);
        return res.status(500).json({ error: 'Error al registrar participante.', detalles: errPart.message });
      }

      // 3. Registrar los detalles de los ítems
      const sqlDetalles = `
        INSERT INTO division_items_detalle (id, participante_id, pedido_item_id, cantidad_asignada, subtotal)
        VALUES ?
      `;

      db.query(sqlDetalles, [itemsProcesados], (errDet) => {
        if (errDet) {
          console.error('❌ Error al guardar detalle de ítems:', errDet.message);
          return res.status(500).json({ error: 'Error al registrar detalle de ítems.', detalles: errDet.message });
        }

        return res.status(201).json({
          exito: true,
          mensaje: `Ítems asignados exitosamente a ${nombre_cliente} 🍕`,
          data: {
            participante_id: participanteId,
            sesion_division_id,
            nombre_cliente,
            total_asignado: totalAsignado,
            items_asignados: items.length
          }
        });
      });
    });
  });
};

module.exports = {
  iniciarSesionDivision,
  asignarItemsACliente
};