const db = require('../config/db');

// Obtener mesas filtradas por su estado
const obtenerMesasPorEstado = (req, res) => {
  const { estado } = req.params; 

  const estadosValidos = ['disponible', 'ocupada', 'en_cobro'];
  
  if (!estadosValidos.includes(estado)) {
    return res.status(400).json({ 
      error: "Estado no válido. Usa 'disponible', 'ocupada' o 'en_cobro'." 
    });
  }

  const query = 'SELECT * FROM mesas WHERE estado = ?';

  db.query(query, [estado], (err, resultados) => {
    if (err) {
      console.error('❌ Error al consultar las mesas:', err.message);
      return res.status(500).json({ 
        error: 'Hubo un error en el servidor al traer las mesas.' 
      });
    }

    res.json({
      mensaje: `¡Mesas en estado '${estado}' cargadas con éxito! 🎲`,
      total: resultados.length,
      datos: resultados
    });
  });
};

// Actualizar el estado de una mesa
const actualizarEstadoMesa = (req, res) => {
  const { id } = req.params;
  const { estado } = req.body;

  const estadosPermitidos = ['disponible', 'ocupada', 'en_cobro'];
  if (!estadosPermitidos.includes(estado)) {
    return res.status(400).json({ error: "Estado no válido. Use: disponible, ocupada o en_cobro." });
  }

  const query = 'UPDATE mesas SET estado = ? WHERE id = ?';

  db.query(query, [estado, id], (err, resultado) => {
    if (err) {
      console.error('❌ Error al actualizar mesa:', err.message);
      return res.status(500).json({ error: 'Hubo un error al actualizar el estado de la mesa.' });
    }

    if (resultado.affectedRows === 0) {
      return res.status(404).json({ error: 'Mesa no encontrada.' });
    }

    res.json({ mensaje: `¡Mesa actualizada a '${estado}' con éxito! 🕹️` });
  });
};

// ==========================================
// TRASLADAR CUENTA Y JUEGOS DE UNA MESA A OTRA
// ==========================================
const trasladarMesa = (req, res) => {
  const { mesa_origen_id, mesa_destino_id } = req.body;

  if (!mesa_origen_id || !mesa_destino_id) {
    return res.status(400).json({ 
      error: "Faltan datos. Se requiere la 'mesa_origen_id' y la 'mesa_destino_id'." 
    });
  }

  if (mesa_origen_id === mesa_destino_id) {
    return res.status(400).json({ 
      error: "La mesa de origen y la mesa de destino no pueden ser la misma." 
    });
  }

  db.beginTransaction((errTx) => {
    if (errTx) {
      console.error('❌ Error al iniciar transacción:', errTx.message);
      return res.status(500).json({ error: 'Error interno al procesar la solicitud.' });
    }

    // 1. Verificar si la mesa de destino ya tiene una cuenta abierta o juego en progreso
    const sqlVerificarDestino = `
      SELECT id FROM pedidos WHERE mesas_id = ? AND estado = 'abierto'
      UNION
      SELECT id FROM sesiones_juego WHERE mesas_id = ? AND estado = 'en_progreso'
    `;

    db.query(sqlVerificarDestino, [mesa_destino_id, mesa_destino_id], (errDestino, resDestino) => {
      if (errDestino) {
        return db.rollback(() => {
          console.error('❌ Error al verificar mesa destino:', errDestino.message);
          res.status(500).json({ error: 'Error al verificar disponibilidad de la mesa destino.' });
        });
      }

      if (resDestino.length > 0) {
        return db.rollback(() => {
          res.status(400).json({ 
            error: 'La mesa de destino ya se encuentra ocupada con una cuenta activa.' 
          });
        });
      }

      // 2. Mover el pedido abierto a la nueva mesa
      const sqlMoverPedido = `
        UPDATE pedidos 
        SET mesas_id = ? 
        WHERE mesas_id = ? AND estado = 'abierto'
      `;

      db.query(sqlMoverPedido, [mesa_destino_id, mesa_origen_id], (errPedido, resPedido) => {
        if (errPedido) {
          return db.rollback(() => {
            console.error('❌ Error al trasladar el pedido:', errPedido.message);
            res.status(500).json({ error: 'Error al trasladar los pedidos a la nueva mesa.' });
          });
        }

        // 3. Mover las sesiones de juego activas a la nueva mesa
        const sqlMoverJuegos = `
          UPDATE sesiones_juego 
          SET mesas_id = ? 
          WHERE mesas_id = ? AND estado = 'en_progreso'
        `;

        db.query(sqlMoverJuegos, [mesa_destino_id, mesa_origen_id], (errJuegos, resJuegos) => {
          if (errJuegos) {
            return db.rollback(() => {
              console.error('❌ Error al trasladar sesiones de juego:', errJuegos.message);
              res.status(500).json({ error: 'Error al trasladar las sesiones de juego.' });
            });
          }

          // Verificar si realmente había algo que mover
          if (resPedido.affectedRows === 0 && resJuegos.affectedRows === 0) {
            return db.rollback(() => {
              res.status(404).json({ 
                error: 'La mesa de origen no tiene ningún pedido ni juego activo para trasladar.' 
              });
            });
          }

          // 4. Confirmar la transacción
          db.commit((errCommit) => {
            if (errCommit) {
              return db.rollback(() => {
                console.error('❌ Error al confirmar la transacción:', errCommit.message);
                res.status(500).json({ error: 'Error al finalizar el traslado.' });
              });
            }

            return res.status(200).json({
              exito: true,
              mensaje: `¡Cuenta trasladada con éxito de la mesa ${mesa_origen_id} a la mesa ${mesa_destino_id}! 🔀`,
              pedidos_movidos: resPedido.affectedRows,
              juegos_movidos: resJuegos.affectedRows
            });
          });
        });
      });
    });
  });
};
// EL MÓDULO SE EXPORTA AL FINAL DE TODO
module.exports = {
  obtenerMesasPorEstado,
  actualizarEstadoMesa,
  trasladarMesa
};