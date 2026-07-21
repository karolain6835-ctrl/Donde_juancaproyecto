const db = require('../config/db');

// ==========================================
// INICIAR SESIÓN DE DIVISIÓN DE CUENTA
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

module.exports = {
  iniciarSesionDivision
};