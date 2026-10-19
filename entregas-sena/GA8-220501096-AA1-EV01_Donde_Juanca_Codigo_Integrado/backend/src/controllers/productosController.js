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
      console.error('Error al consultar los productos:', new Error('Fallo interno; detalles sensibles omitidos.').stack);

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
      console.error('Error al consultar el producto:', new Error('Fallo interno; detalles sensibles omitidos.').stack);

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
  const body = req.body;
  const campos = ['nombre', 'codigo', 'precio_venta', 'cantidad', 'stock_minimo', 'categorias_id', 'proveedores_id'];
  if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some(campo => !campos.includes(campo))) {
    return res.status(400).json({ error: 'Envía únicamente nombre, codigo, precio_venta, cantidad, stock_minimo, categorias_id y proveedores_id.' });
  }
  const {
    nombre,
    codigo,
    precio_venta,
    cantidad,
    stock_minimo,
    categorias_id,
    proveedores_id
  } = body;

  if (
    typeof nombre !== 'string' || !nombre.trim() || nombre.length > 150 ||
    typeof codigo !== 'string' || !codigo.trim() || codigo.length > 50 ||
    precio_venta === undefined ||
    !categorias_id ||
    typeof proveedores_id !== 'string' || !proveedores_id.trim() || proveedores_id.length > 36 ||
    !Number.isInteger(Number(categorias_id)) || Number(categorias_id) <= 0
  ) {
    return res.status(400).json({
      error:
        'Faltan datos obligatorios para crear el producto.'
    });
  }

  if (!['number', 'string'].includes(typeof precio_venta) || !Number.isFinite(Number(precio_venta)) || Number(precio_venta) <= 0) {
    return res.status(400).json({
      error: 'El precio de venta debe ser mayor que 0.'
    });
  }

  if ([cantidad, stock_minimo].some(valor => valor !== undefined &&
      (!Number.isInteger(valor) || valor < 0 || valor > 2147483647))) {
    return res.status(400).json({ error: 'cantidad y stock_minimo deben ser enteros no negativos dentro del rango permitido.' });
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
    nombre.trim(),
    codigo.trim(),
    precio_venta,
    0, // CPP inicial: solo las recepciones controladas establecen costo.
    cantidad || 0,
    stock_minimo || 0,
    estado,
    categorias_id,
    proveedores_id,
    null
  ];

  db.query(query, valores, (err) => {
    if (err) {
      console.error('Error al crear producto:', new Error('Fallo interno; detalles sensibles omitidos.').stack);

      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({
          error:
            'Ya existe un producto con ese código.'
        });
      }

      if (err.code === 'ER_NO_REFERENCED_ROW_2') {
        return res.status(404).json({ error: 'La categoría o el proveedor especificado no existe.' });
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
    stock_minimo,
    estado,
    categorias_id,
    proveedores_id
  } = req.body;

  if (
    !nombre ||
    !codigo ||
    precio_venta === undefined ||
    !estado ||
    !categorias_id ||
    !proveedores_id
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
      stock_minimo = ?,
      estado = ?,
      categorias_id = ?,
      proveedores_id = ?
    WHERE id = ?
  `;

  const valores = [
    nombre,
    codigo,
    precio_venta,
    stock_minimo || 0,
    estado,
    categorias_id,
    proveedores_id,
    id
  ];

  db.query(query, valores, (err, resultado) => {
    if (err) {
      console.error('Error al actualizar producto:', new Error('Fallo interno; detalles sensibles omitidos.').stack);

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
      mensaje: 'Producto actualizado correctamente.',
      ...(Object.hasOwn(req.body,'costo_promedio') || Object.hasOwn(req.body,'costo_promedio_ponderado') ? {
        aviso_costo: 'El CPP no se modifica mediante edicion general; se conserva el costo actual.'
      } : {}),
      ...(Object.prototype.hasOwnProperty.call(req.body, 'cantidad') ? {
        aviso: 'cantidad se ignora en la edición general. Para cambiar existencias utiliza PUT /api/inventario/actualizar-stock.'
      } : {})
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
      console.error('Error al eliminar producto:', new Error('Fallo interno; detalles sensibles omitidos.').stack);

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
