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

// ... (tu función obtenerProductos ya está aquí) ...

// Crear un nuevo producto
const crearProducto = (req, res) => {
  const { nombre, codigo, precio_venta, costo_promedio, cantidad, stock_minimo, categorias_id, proveedores_id, historial_costos_id } = req.body;

  if (!nombre || !codigo || !precio_venta || !categorias_id || !proveedores_id || !historial_costos_id) {
    return res.status(400).json({ error: "Faltan datos obligatorios para crear el producto." });
  }

  const id = crypto.randomUUID();
  const estado = 'activo';

  const query = `
    INSERT INTO productos 
    (id, nombre, codigo, precio_venta, costo_promedio_ponderado, cantidad_disponible, stock_minimo, estado, categorias_id, proveedores_id, historial_costos_id) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(query, [id, nombre, codigo, precio_venta, costo_promedio, cantidad, stock_minimo, estado, categorias_id, proveedores_id, historial_costos_id], (err, resultado) => {
    if (err) {
      console.error('❌ Error al crear producto:', err.message);
      return res.status(500).json({ error: 'No se pudo crear el producto. Verifica los IDs de categoría, proveedor e historial.' });
    }
    res.status(201).json({ mensaje: '¡Producto registrado en el inventario de Donde Juanca! 📦', id_producto: id });
  });
};

// Actualiza tu export para incluir la nueva función
module.exports = {
  obtenerProductos,
  crearProducto
};

module.exports = {
  obtenerProductos,
  crearProducto
};