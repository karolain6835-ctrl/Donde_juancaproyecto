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

// ==========================================
// 3. CONSULTAR RESUMEN DE LA SESIÓN DE DIVISIÓN
// ==========================================
const obtenerResumenDivision = (req, res) => {
  const { id: sesion_division_id } = req.params;

  // 1. Obtener la información básica de la sesión
  const querySesion = `
    SELECT s.id, s.modalidad, s.mesas_id, s.usuarios_id, s.creado_en, m.numero AS numero_mesa
    FROM sesiones_division_cuentas s
    LEFT JOIN mesas m ON s.mesas_id = m.id
    WHERE s.id = ?
  `;

  db.query(querySesion, [sesion_division_id], (errSesion, resSesion) => {
    if (errSesion) {
      console.error('❌ Error al consultar la sesión:', errSesion.message);
      return res.status(500).json({ error: 'Error al consultar la sesión.', detalles: errSesion.message });
    }

    if (resSesion.length === 0) {
      return res.status(404).json({ error: 'La sesión de división no existe.' });
    }

    const sesion = resSesion[0];

    // 2. Obtener los participantes y sus ítems asignados
    const queryDetalle = `
      SELECT 
        p.id AS participante_id,
        p.nombre_cliente,
        p.total_asignado,
        p.estado,
        d.id AS detalle_id,
        d.pedido_item_id,
        d.cantidad_asignada,
        d.subtotal
      FROM division_participantes p
      LEFT JOIN division_items_detalle d ON p.id = d.participante_id
      WHERE p.sesion_division_id = ?
      ORDER BY p.creado_en ASC
    `;

    db.query(queryDetalle, [sesion_division_id], (errDetalle, resDetalle) => {
      if (errDetalle) {
        console.error('❌ Error al consultar participantes e ítems:', errDetalle.message);
        return res.status(500).json({ error: 'Error al consultar detalle de división.', detalles: errDetalle.message });
      }

      // Agrupar los ítems bajo cada participante
      const participantesMap = {};
      let granTotal = 0;

      resDetalle.forEach(fila => {
        if (!participantesMap[fila.participante_id]) {
          participantesMap[fila.participante_id] = {
            id: fila.participante_id,
            nombre_cliente: fila.nombre_cliente,
            total_asignado: parseFloat(fila.total_asignado) || 0,
            estado: fila.estado,
            items: []
          };
          granTotal += parseFloat(fila.total_asignado) || 0;
        }

        if (fila.detalle_id) {
          participantesMap[fila.participante_id].items.push({
            detalle_id: fila.detalle_id,
            pedido_item_id: fila.pedido_item_id,
            cantidad: fila.cantidad_asignada,
            subtotal: parseFloat(fila.subtotal) || 0
          });
        }
      });

      return res.status(200).json({
        exito: true,
        mensaje: 'Resumen de la división obtenido correctamente 🍕',
        data: {
          sesion: {
            id: sesion.id,
            modalidad: sesion.modalidad,
            mesas_id: sesion.mesas_id,
            numero_mesa: sesion.numero_mesa,
            usuarios_id: sesion.usuarios_id,
            creado_en: sesion.creado_en
          },
          total_acumulado: granTotal,
          participantes: Object.values(participantesMap)
        }
      });
    });
  });
};

module.exports = {
  iniciarSesionDivision,
  asignarItemsACliente,
  obtenerResumenDivision
};