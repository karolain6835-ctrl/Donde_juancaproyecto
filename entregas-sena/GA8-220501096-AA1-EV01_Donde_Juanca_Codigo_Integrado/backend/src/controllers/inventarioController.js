const { ejecutor } = require('../services/identidadService');
const db = require('../config/db');
const mysql = require('mysql2');
const crypto = require('crypto');

// 1. Ajustar la existencia operativa y registrar su movimiento atómicamente.
exports.actualizarStock = async (req, res) => {
  const usuarios_id = ejecutor(req, res);
  if (!usuarios_id) return;
  const { producto_id, nueva_cantidad } = req.body || {};

  if (typeof producto_id !== 'string' || !producto_id.trim() ||
      typeof usuarios_id !== 'string' || !usuarios_id.trim() || nueva_cantidad === undefined) {
    return res.status(400).json({ error: 'producto_id y nueva_cantidad son obligatorios.' });
  }
  if (!Number.isInteger(nueva_cantidad) || nueva_cantidad < 0 || nueva_cantidad > 2147483647) {
    return res.status(400).json({ error: 'nueva_cantidad debe ser un número entero entre 0 y 2147483647.' });
  }

  let conexion;
  let transaccionIniciada = false;
  const errorAjuste = (status, mensaje) => Object.assign(new Error(mensaje), { status });
  try {
    conexion = mysql.createConnection(db.dbConfig).promise();
    await conexion.beginTransaction();
    transaccionIniciada = true;
    const [productos] = await conexion.query(
      'SELECT cantidad_disponible, nombre FROM productos WHERE id = ? FOR UPDATE', [producto_id]
    );
    if (!productos.length) throw errorAjuste(404, 'Producto no encontrado.');
    const [usuarios] = await conexion.query('SELECT id FROM usuarios WHERE id = ? LOCK IN SHARE MODE', [usuarios_id]);
    if (!usuarios.length) throw errorAjuste(404, 'Usuario no encontrado.');

    const stock_antes = productos[0].cantidad_disponible;
    const producto_nombre = productos[0].nombre;
    const diferencia = nueva_cantidad - stock_antes;
    // cantidad y existencias son INT con signo en el esquema instalado.
    if (!Number.isInteger(stock_antes) || diferencia < -2147483648 || diferencia > 2147483647) {
      throw errorAjuste(409, 'La existencia o la diferencia no es representable en el inventario.');
    }
    if (diferencia === 0) {
      await conexion.rollback();
      transaccionIniciada = false;
      return res.status(200).json({
        mensaje: 'Sin cambios: la existencia ya coincide con nueva_cantidad.',
        producto_id, producto_nombre, stock_anterior: stock_antes, stock_actual: nueva_cantidad, diferencia
      });
    }

    const [actualizacion] = await conexion.query(
      'UPDATE productos SET cantidad_disponible = ? WHERE id = ?', [nueva_cantidad, producto_id]
    );
    if (actualizacion.affectedRows !== 1) throw new Error('No se actualizó la existencia del producto.');
    const [movimiento] = await conexion.query(`
      INSERT INTO movimientos_inventario
      (id, tipo, cantidad, stock_antes, stock_despues, referencia_tipo, productos_id, usuarios_id, creado_en, referencia_id)
      VALUES (?, 'ajuste', ?, ?, ?, 'ajuste', ?, ?, UTC_TIMESTAMP(), NULL)`,
      [crypto.randomUUID(), diferencia, stock_antes, nueva_cantidad, producto_id, usuarios_id]
    );
    if (movimiento.affectedRows !== 1) throw new Error('No se registró el movimiento de inventario.');
    await conexion.commit();
    transaccionIniciada = false;
    return res.status(200).json({
      mensaje: `Inventario actualizado con éxito. ${producto_nombre} ahora tiene ${nueva_cantidad} unidades.`,
      producto_id, producto_nombre, stock_anterior: stock_antes, stock_actual: nueva_cantidad, diferencia
    });
  } catch (error) {
    if (transaccionIniciada) {
      try { await conexion.rollback(); }
      catch (errorRollback) { console.error('Error al revertir ajuste:', new Error('Fallo interno; detalles sensibles omitidos.').stack); }
    }
    console.error('Error al ajustar inventario:', new Error('Fallo interno; detalles sensibles omitidos.').stack);
    return res.status(error.status || 500).json({
      error: error.status ? error.message : 'No se pudo ajustar el inventario.'
    });
  } finally {
    if (conexion) {
      try { await conexion.end(); }
      catch (errorConexion) { console.error('Error al cerrar conexión de ajuste:', new Error('Fallo interno; detalles sensibles omitidos.').stack); }
    }
  }
};

exports.obtenerMovimientos = async (req, res) => {
  const query = req.query || {};
  const permitidos = ['producto_id', 'tipo', 'usuarios_id', 'pagina', 'limite'];
  if (Object.keys(query).some(clave => !permitidos.includes(clave)) ||
      Object.values(query).some(valor => typeof valor !== 'string' || !valor.trim())) {
    return res.status(400).json({ error: 'Parámetros de consulta inválidos.' });
  }
  const entero = (valor, defecto) => valor === undefined ? defecto
    : /^[1-9]\d*$/.test(valor) && Number.isSafeInteger(Number(valor)) ? Number(valor) : NaN;
  const pagina = entero(query.pagina, 1);
  const limite = entero(query.limite, 20);
  const offset = (pagina - 1) * limite;
  if (!Number.isSafeInteger(pagina) || !Number.isSafeInteger(limite) || limite > 100 ||
      !Number.isSafeInteger(offset) ||
      (query.tipo !== undefined && !['compra', 'venta', 'merma', 'ajuste'].includes(query.tipo)) ||
      [query.producto_id, query.usuarios_id].some(id => id !== undefined && (id.length > 36 || id !== id.trim()))) {
    return res.status(400).json({ error: 'Filtros o paginación inválidos.' });
  }
  const condiciones = [];
  const parametros = [];
  for (const [filtro, columna] of [['producto_id', 'productos_id'], ['tipo', 'tipo'], ['usuarios_id', 'usuarios_id']]) {
    if (query[filtro] !== undefined) {
      condiciones.push(`mi.${columna} = ?`);
      parametros.push(query[filtro]);
    }
  }
  const where = condiciones.length ? ` WHERE ${condiciones.join(' AND ')}` : '';
  let conexion;
  let transaccion = false;
  try {
    conexion = mysql.createConnection(db.dbConfig).promise();
    // Ambas consultas usan la misma instantánea, incluso con READ COMMITTED configurado globalmente.
    await conexion.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');
    await conexion.query('START TRANSACTION WITH CONSISTENT SNAPSHOT, READ ONLY');
    transaccion = true;
    const [[conteo]] = await conexion.query(`SELECT COUNT(*) AS total FROM movimientos_inventario mi${where}`, parametros);
    const [datos] = await conexion.query(`
      SELECT mi.id, mi.tipo, mi.cantidad, mi.stock_antes, mi.stock_despues,
             mi.referencia_tipo, mi.referencia_id,
             DATE_FORMAT(mi.creado_en, '%Y-%m-%dT%H:%i:%sZ') AS creado_en,
             mi.productos_id, p.nombre AS producto_nombre, p.codigo AS producto_codigo,
             mi.usuarios_id, u.nombre AS usuario_nombre
      FROM movimientos_inventario mi
      LEFT JOIN productos p ON p.id = mi.productos_id
      LEFT JOIN usuarios u ON u.id = mi.usuarios_id
      ${where}
      ORDER BY (mi.creado_en IS NULL) ASC, mi.creado_en DESC, mi.id DESC
      LIMIT ? OFFSET ?`, [...parametros, limite, offset]);
    await conexion.commit();
    transaccion = false;
    const total = Number(conteo.total);
    return res.status(200).json({
      mensaje: 'Movimientos consultados correctamente.', datos,
      paginacion: { pagina, limite, total, total_paginas: Math.ceil(total / limite) }
    });
  } catch (error) {
    if (transaccion) {
      try { await conexion.rollback(); }
      catch (rollback) { console.error('Error al revertir lectura:', new Error('Fallo interno; detalles sensibles omitidos.').stack); }
    }
    console.error('Error al consultar movimientos:', new Error('Fallo interno; detalles sensibles omitidos.').stack);
    return res.status(500).json({ error: 'No se pudieron consultar los movimientos.' });
  } finally {
    if (conexion) {
      try { await conexion.end(); }
      catch (cierre) { console.error('Error al cerrar lectura:', new Error('Fallo interno; detalles sensibles omitidos.').stack); }
    }
  }
};

// Consulta persistente, manteniendo el punto de entrada del controlador existente.
exports.obtenerAlertas = require('./alertasInventarioController').listar;
