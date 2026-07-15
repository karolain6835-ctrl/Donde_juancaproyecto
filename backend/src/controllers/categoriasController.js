const db = require('../config/db');

const obtenerCategorias = (req, res) => {
  const query = 'SELECT * FROM categorias';

  db.query(query, (err, resultados) => {
    if (err) {
      console.error('❌ Error al consultar las categorías:', err.message);
      return res.status(500).json({ error: 'Hubo un error al traer las categorías.' });
    }
    res.json({
      mensaje: "¡Categorías cargadas con éxito! 🍻",
      total: resultados.length,
      datos: resultados
    });
  });
};

module.exports = { obtenerCategorias };