const db = require('../config/db');

// Obtener mesas filtradas por su estado
const obtenerMesasPorEstado = (req, res) => {
  // Extraemos el estado que el usuario escriba en la URL
  const { estado } = req.params; 

  // Validamos que sea uno de los estados permitidos en tu ENUM
  const estadosValidos = ['disponible', 'ocupada', 'en_cobro'];
  
  if (!estadosValidos.includes(estado)) {
    return res.status(400).json({ 
      error: "Estado no válido. Usa 'disponible', 'ocupada' o 'en_cobro'." 
    });
  }

  // Consulta preparada con "?" para mayor seguridad
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

module.exports = {
  obtenerMesasPorEstado
};