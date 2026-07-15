const db = require('../config/db');

// Obtener todos los productos activos con su categoría
const obtenerProductos = (req, res) => {
 // Usamos un INNER JOIN para traer el nombre de la categoría de una vez
  const query = `
    SELECT p.*, c.nombre AS categoria_nombre 
    FROM productos p
    INNER JOIN categorias c ON p.categorias_id = c.id
  `;

  db.query(query, (err, resultados) => {
    if (err) {
      console.error('❌ Error al consultar los productos:', err.message);
      return res.status(500).json({ 
        error: 'Hubo un error en el servidor al traer los productos.' 
      });
    }

    res.json({
      mensaje: "¡Productos de Donde Juanca cargados con éxito! 📦",
      total: resultados.length,
      datos: resultados
    });
  });
};

module.exports = {
  obtenerProductos
};