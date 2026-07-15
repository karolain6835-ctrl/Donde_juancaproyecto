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

// EL MÓDULO SE EXPORTA AL FINAL DE TODO
module.exports = {
  obtenerMesasPorEstado,
  actualizarEstadoMesa
};