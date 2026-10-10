const db = require('../config/db');
const mysql = require('mysql2');
const crypto = require('crypto');

// 1. Ajustar la existencia operativa y registrar su movimiento atómicamente.
exports.actualizarStock = async (req, res) => {
  const { producto_id, nueva_cantidad, usuarios_id } = req.body || {};

  if (typeof producto_id !== 'string' || !producto_id.trim() ||
      typeof usuarios_id !== 'string' || !usuarios_id.trim() || nueva_cantidad === undefined) {
    return res.status(400).json({ error: 'producto_id, nueva_cantidad y usuarios_id son obligatorios.' });
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
      'SELECT cantidad_disponible FROM productos WHERE id = ? FOR UPDATE', [producto_id]
    );
    if (!productos.length) throw errorAjuste(404, 'Producto no encontrado.');
    const [usuarios] = await conexion.query('SELECT id FROM usuarios WHERE id = ? LOCK IN SHARE MODE', [usuarios_id]);
    if (!usuarios.length) throw errorAjuste(404, 'Usuario no encontrado.');

    const stock_antes = productos[0].cantidad_disponible;
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
        producto_id, stock_anterior: stock_antes, stock_actual: nueva_cantidad, diferencia
      });
    }

    const [actualizacion] = await conexion.query(
      'UPDATE productos SET cantidad_disponible = ? WHERE id = ?', [nueva_cantidad, producto_id]
    );
    if (actualizacion.affectedRows !== 1) throw new Error('No se actualizó la existencia del producto.');
    const [movimiento] = await conexion.query(`
      INSERT INTO movimientos_inventario
      (id, tipo, cantidad, stock_antes, stock_despues, referencia_tipo, productos_id, usuarios_id)
      VALUES (?, 'ajuste', ?, ?, ?, 'ajuste', ?, ?)`,
      [crypto.randomUUID(), diferencia, stock_antes, nueva_cantidad, producto_id, usuarios_id]
    );
    if (movimiento.affectedRows !== 1) throw new Error('No se registró el movimiento de inventario.');
    await conexion.commit();
    transaccionIniciada = false;
    return res.status(200).json({
      mensaje: `¡Inventario actualizado con éxito! Producto [${producto_id}] ahora tiene ${nueva_cantidad} unidades.`,
      producto_id, stock_anterior: stock_antes, stock_actual: nueva_cantidad, diferencia
    });
  } catch (error) {
    if (transaccionIniciada) {
      try { await conexion.rollback(); }
      catch (errorRollback) { console.error('Error al revertir ajuste:', errorRollback.message); }
    }
    console.error('Error al ajustar inventario:', error.message);
    return res.status(error.status || 500).json({
      error: error.status ? error.message : 'No se pudo ajustar el inventario.'
    });
  } finally {
    if (conexion) {
      try { await conexion.end(); }
      catch (errorConexion) { console.error('Error al cerrar conexión de ajuste:', errorConexion.message); }
    }
  }
};

// 2. Obtener alertas de stock bajo activas (Simulado para desarrollo ágil)
exports.obtenerAlertas = async (req, res) => {
  // Simulamos un listado de productos que ya cruzaron el stock mínimo en el bar
  const alertasSimuladas = [
    {
      id: "ALERT-001",
      producto: "Cerveza Club Colombia Dorada",
      stock_actual: 5,
      stock_minimo: 24,
      mensaje: "¡Alerta Crítica! Quedan pocas unidades para el fin de semana.",
      fecha: new Date()
    },
    {
      id: "ALERT-002",
      producto: "Aguardiente Antioqueño 750ml",
      stock_actual: 2,
      stock_minimo: 6,
      mensaje: "Stock por debajo del límite permitido.",
      fecha: new Date()
    }
  ];

  res.json({
    mensaje: "Alertas de inventario consultadas con éxito.",
    total_alertas: alertasSimuladas.length,
    alertas: alertasSimuladas
  });
};
