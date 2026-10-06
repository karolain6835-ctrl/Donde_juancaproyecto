const db = require('../config/db');
const crypto = require('crypto');

// ==========================================
// READ - OBTENER TODOS LOS PRODUCTOS
// ==========================================
const obtenerProductos = (req, res) => {
  const query = `
    SELECT
      p.*,
      c.nombre AS categoria_nombre
    FROM productos p
    INNER JOIN categorias c
      ON p.categorias_id = c.id
    ORDER BY p.nombre ASC
  `;

  db.query(query, (err, resultados) => {
    if (err) {
      console.error(
        'Error al consultar los productos:',
        err.message
      );

      return res.status(500).json({
        error:
          'Hubo un error en el servidor al consultar los productos.'
      });
    }

    return res.status(200).json({
      mensaje: 'Productos consultados correctamente.',
      total: resultados.length,
      datos: resultados
    });
  });
};

// ==========================================
// READ - OBTENER PRODUCTO POR ID
// ==========================================
const obtenerProductoPorId = (req, res) => {
  const { id } = req.params;

  const query = `
    SELECT
      p.*,
      c.nombre AS categoria_nombre
    FROM productos p
    INNER JOIN categorias c
      ON p.categorias_id = c.id
    WHERE p.id = ?
  `;

  db.query(query, [id], (err, resultados) => {
    if (err) {
      console.error(
        'Error al consultar el producto:',
        err.message
      );

      return res.status(500).json({
        error:
          'Hubo un error en el servidor al consultar el producto.'
      });
    }

    if (resultados.length === 0) {
      return res.status(404).json({
        error: 'Producto no encontrado.'
      });
    }

    return res.status(200).json({
      mensaje: 'Producto encontrado correctamente.',
      datos: resultados[0]
    });
  });
};

// ==========================================
// CREATE - CREAR PRODUCTO
// ==========================================
const crearProducto = (req, res) => {
  const {
    nombre,
    codigo,
    precio_venta,
    costo_promedio,
    cantidad,
    stock_minimo,
    categorias_id,
    proveedores_id,
    historial_costos_id
  } = req.body;

  if (
    !nombre ||
    !codigo ||
    precio_venta === undefined ||
    !categorias_id ||
    !proveedores_id ||
    !historial_costos_id
  ) {
    return res.status(400).json({
      error:
        'Faltan datos obligatorios para crear el producto.'
    });
  }

  if (Number(precio_venta) <= 0) {
    return res.status(400).json({
      error: 'El precio de venta debe ser mayor que 0.'
    });
  }

  const id = crypto.randomUUID();
  const estado = 'activo';

  const query = `
    INSERT INTO productos (
      id,
      nombre,
      codigo,
      precio_venta,
      costo_promedio_ponderado,
      cantidad_disponible,
      stock_minimo,
      estado,
      categorias_id,
      proveedores_id,
      historial_costos_id
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const valores = [
    id,
    nombre,
    codigo,
    precio_venta,
    costo_promedio || 0,
    cantidad || 0,
    stock_minimo || 0,
    estado,
    categorias_id,
    proveedores_id,
    historial_costos_id
  ];

  db.query(query, valores, (err) => {
    if (err) {
      console.error(
        'Error al crear producto:',
        err.message
      );

      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({
          error:
            'Ya existe un producto con ese código.'
        });
      }

      return res.status(500).json({
        error:
          'No se pudo crear el producto. Verifica los datos relacionados.'
      });
    }

    return res.status(201).json({
      mensaje: 'Producto creado correctamente.',
      id_producto: id
    });
  });
};

// ==========================================
// UPDATE - ACTUALIZAR PRODUCTO
// ==========================================
const actualizarProducto = (req, res) => {
  const { id } = req.params;

  const {
    nombre,
    codigo,
    precio_venta,
    costo_promedio,
    cantidad,
    stock_minimo,
    estado,
    categorias_id,
    proveedores_id,
    historial_costos_id
  } = req.body;

  if (
    !nombre ||
    !codigo ||
    precio_venta === undefined ||
    !estado ||
    !categorias_id ||
    !proveedores_id ||
    !historial_costos_id
  ) {
    return res.status(400).json({
      error:
        'Faltan datos obligatorios para actualizar el producto.'
    });
  }

  if (Number(precio_venta) <= 0) {
    return res.status(400).json({
      error:
        'El precio de venta debe ser mayor que 0.'
    });
  }

  const query = `
    UPDATE productos
    SET
      nombre = ?,
      codigo = ?,
      precio_venta = ?,
      costo_promedio_ponderado = ?,
      cantidad_disponible = ?,
      stock_minimo = ?,
      estado = ?,
      categorias_id = ?,
      proveedores_id = ?,
      historial_costos_id = ?
    WHERE id = ?
  `;

  const valores = [
    nombre,
    codigo,
    precio_venta,
    costo_promedio || 0,
    cantidad || 0,
    stock_minimo || 0,
    estado,
    categorias_id,
    proveedores_id,
    historial_costos_id,
    id
  ];

  db.query(query, valores, (err, resultado) => {
    if (err) {
      console.error(
        'Error al actualizar producto:',
        err.message
      );

      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({
          error:
            'Ya existe otro producto con ese código.'
        });
      }

      return res.status(500).json({
        error:
          'No se pudo actualizar el producto.'
      });
    }

    if (resultado.affectedRows === 0) {
      return res.status(404).json({
        error: 'Producto no encontrado.'
      });
    }

    return res.status(200).json({
      mensaje: 'Producto actualizado correctamente.'
    });
  });
};

// ==========================================
// DELETE - ELIMINAR PRODUCTO
// ==========================================
const eliminarProducto = (req, res) => {
  const { id } = req.params;

  const query = `
    DELETE FROM productos
    WHERE id = ?
  `;

  db.query(query, [id], (err, resultado) => {
    if (err) {
      console.error(
        'Error al eliminar producto:',
        err.message
      );

      // Si el producto ya está relacionado con pedidos,
      // MySQL puede impedir su eliminación.
      if (err.code === 'ER_ROW_IS_REFERENCED_2') {
        return res.status(409).json({
          error:
            'El producto no puede eliminarse porque está relacionado con otros registros.'
        });
      }

      return res.status(500).json({
        error:
          'No se pudo eliminar el producto.'
      });
    }

    if (resultado.affectedRows === 0) {
      return res.status(404).json({
        error: 'Producto no encontrado.'
      });
    }

    return res.status(200).json({
      mensaje: 'Producto eliminado correctamente.'
    });
  });
};

// ==========================================
// EXPORTAR FUNCIONES
// ==========================================
module.exports = {
  obtenerProductos,
  obtenerProductoPorId,
  crearProducto,
  actualizarProducto,
  eliminarProducto
};