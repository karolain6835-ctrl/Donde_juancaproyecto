const { ejecutor } = require('../services/identidadService');
const db = require('../config/db');
const mysql = require('mysql2');
const crypto = require('crypto');

const errorMerma = (status, mensaje) => Object.assign(new Error(mensaje), { status });
const idValido = id => typeof id === 'string' && id.length > 0 && id.length <= 36 && id === id.trim();

// Conexión exclusiva por petición; toda respuesta exitosa ocurre después del commit.
const conConexion = async (res, operacion, lectura = false) => {
  let conexion;
  let transaccion = false;
  try {
    conexion = mysql.createConnection(db.dbConfig).promise();
    if (lectura) {
      await conexion.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');
      await conexion.query('START TRANSACTION WITH CONSISTENT SNAPSHOT, READ ONLY');
    } else {
      await conexion.beginTransaction();
    }
    transaccion = true;
    const resultado = await operacion(conexion);
    await conexion.commit();
    transaccion = false;
    return res.status(resultado.status).json(resultado.body);
  } catch (error) {
    if (transaccion) {
      try { await conexion.rollback(); }
      catch (rollback) { console.error('Error al revertir mermas:', new Error('Fallo interno; detalles sensibles omitidos.').stack); }
    }
    console.error('Error en mermas:', new Error('Fallo interno; detalles sensibles omitidos.').stack);
    return res.status(error.status || 500).json({
      error: error.status ? error.message : 'No se pudo completar la operación de mermas.'
    });
  } finally {
    if (conexion) {
      try { await conexion.end(); }
      catch (cierre) { console.error('Error al cerrar conexión de mermas:', new Error('Fallo interno; detalles sensibles omitidos.').stack); }
    }
  }
};

exports.registrarMerma = async (req, res) => {
  const usuarios_id = ejecutor(req, res);
  if (!usuarios_id) return;
  const { productos_id, cantidad, merma_motivos_id, refrigeradores_id } = req.body || {};
  if (![productos_id, merma_motivos_id, refrigeradores_id, usuarios_id].every(idValido)) {
    return res.status(400).json({ error: 'productos_id, merma_motivos_id y refrigeradores_id son obligatorios y deben ser IDs válidos.' });
  }
  if (!Number.isInteger(cantidad) || cantidad <= 0 || cantidad > 2147483647) {
    return res.status(400).json({ error: 'cantidad debe ser un número entero positivo dentro del rango INT.' });
  }
  return conConexion(res, async conexion => {
    const id = crypto.randomUUID();
    const movimiento_id = crypto.randomUUID();
    // Bloquear producto primero, igual que los demás escritores de inventario.
    const [productos] = await conexion.query(`
      SELECT cantidad_disponible, CAST(costo_promedio_ponderado AS CHAR) AS costo
      FROM productos WHERE id = ? FOR UPDATE`, [productos_id]);
    if (!productos.length) throw errorMerma(404, 'Producto no encontrado.');
    for (const [tabla, referencia, nombre] of [
      ['merma_motivos', merma_motivos_id, 'Motivo'],
      ['refrigeradores', refrigeradores_id, 'Refrigerador'],
      ['usuarios', usuarios_id, 'Usuario']
    ]) {
      const [filas] = await conexion.query(`SELECT id FROM ${tabla} WHERE id = ? LOCK IN SHARE MODE`, [referencia]);
      if (!filas.length) throw errorMerma(404, `${nombre} no encontrado.`);
    }
    const stock_antes = productos[0].cantidad_disponible;
    if (!Number.isInteger(stock_antes) || stock_antes < 0) throw errorMerma(409, 'La existencia del producto es inválida.');
    if (cantidad > stock_antes) throw errorMerma(400, 'La cantidad de merma supera la existencia disponible.');
    const stock_despues = stock_antes - cantidad;
    // DECIMAL(10,2) leído como texto: aritmética exacta en centavos, sin floats.
    const costo = productos[0].costo;
    if (!/^\d+\.\d{2}$/.test(costo)) throw errorMerma(409, 'El costo promedio del producto es inválido.');
    const [unidades, decimales] = costo.split('.');
    const centavos = (BigInt(unidades) * 100n + BigInt(decimales)) * BigInt(cantidad);
    if (centavos > 9999999999n) throw errorMerma(409, 'El valor económico supera el rango DECIMAL(10,2).');
    const valor_economico = `${centavos / 100n}.${String(centavos % 100n).padStart(2, '0')}`;

    const [actualizacion] = await conexion.query(`
      UPDATE productos SET cantidad_disponible = cantidad_disponible - ?
      WHERE id = ? AND cantidad_disponible >= ?`, [cantidad, productos_id, cantidad]);
    if (actualizacion.affectedRows !== 1) throw new Error('No se descontó la existencia.');
    const [movimiento] = await conexion.query(`
      INSERT INTO movimientos_inventario
      (id,tipo,cantidad,stock_antes,stock_despues,referencia_tipo,referencia_id,productos_id,usuarios_id,creado_en)
      VALUES (?,'merma',?,?,?,'merma',?,?,?,UTC_TIMESTAMP())`,
      [movimiento_id, -cantidad, stock_antes, stock_despues, id, productos_id, usuarios_id]);
    if (movimiento.affectedRows !== 1) throw new Error('No se registró el movimiento de merma.');
    // Copiar la fecha persistida garantiza el mismo instante, incluso entre segundos.
    const [merma] = await conexion.query(`
      INSERT INTO mermas
      (id,cantidad,valor_economico,creado_en,productos_id,merma_motivos_id,refrigeradores_id,movimientos_inventario_id,usuarios_id)
      SELECT ?,?,?,mi.creado_en,?,?,?,?,? FROM movimientos_inventario mi WHERE mi.id = ?`,
      [id, cantidad, valor_economico, productos_id, merma_motivos_id, refrigeradores_id, movimiento_id, usuarios_id, movimiento_id]);
    if (merma.affectedRows !== 1) throw new Error('No se registró la merma.');
    const [[fecha]] = await conexion.query("SELECT DATE_FORMAT(creado_en, '%Y-%m-%dT%H:%i:%sZ') AS creado_en FROM mermas WHERE id = ?", [id]);
    return { status: 201, body: { mensaje: 'Merma registrada correctamente.', datos: {
      id, cantidad, valor_economico, creado_en: fecha.creado_en, productos_id,
      merma_motivos_id, refrigeradores_id, movimientos_inventario_id: movimiento_id, usuarios_id,
      stock_anterior: stock_antes, stock_actual: stock_despues
    } } };
  });
};

exports.obtenerMermas = async (req, res) => {
  const query = req.query || {};
  const filtros = { producto_id: 'productos_id', motivo_id: 'merma_motivos_id',
    refrigerador_id: 'refrigeradores_id', usuarios_id: 'usuarios_id' };
  const permitidos = [...Object.keys(filtros), 'pagina', 'limite'];
  if (Object.keys(query).some(k => !permitidos.includes(k)) ||
      Object.values(query).some(v => typeof v !== 'string') ||
      Object.keys(filtros).some(k => query[k] !== undefined && !idValido(query[k]))) {
    return res.status(400).json({ error: 'Filtros inválidos.' });
  }
  const entero = (v, defecto) => v === undefined ? defecto : /^[1-9]\d*$/.test(v) ? Number(v) : NaN;
  const pagina = entero(query.pagina, 1);
  const limite = entero(query.limite, 20);
  const offset = (pagina - 1) * limite;
  if (!Number.isSafeInteger(pagina) || !Number.isSafeInteger(limite) || limite > 100 || !Number.isSafeInteger(offset)) {
    return res.status(400).json({ error: 'Paginación inválida.' });
  }
  const condiciones = [];
  const parametros = [];
  for (const [filtro, columna] of Object.entries(filtros)) {
    if (query[filtro] !== undefined) { condiciones.push(`m.${columna} = ?`); parametros.push(query[filtro]); }
  }
  const where = condiciones.length ? ` WHERE ${condiciones.join(' AND ')}` : '';
  return conConexion(res, async conexion => {
    const [[conteo]] = await conexion.query(`SELECT COUNT(*) AS total FROM mermas m${where}`, parametros);
    const [datos] = await conexion.query(`
      SELECT m.id,m.cantidad,CAST(m.valor_economico AS CHAR) AS valor_economico,
             DATE_FORMAT(m.creado_en, '%Y-%m-%dT%H:%i:%sZ') AS creado_en,
             m.productos_id,p.nombre AS producto_nombre,
             m.merma_motivos_id,mm.nombre AS motivo_nombre,
             m.refrigeradores_id,r.nombre AS refrigerador_nombre,
             m.movimientos_inventario_id,m.usuarios_id,u.nombre AS usuario_nombre
      FROM mermas m
      LEFT JOIN productos p ON p.id=m.productos_id
      LEFT JOIN merma_motivos mm ON mm.id=m.merma_motivos_id
      LEFT JOIN refrigeradores r ON r.id=m.refrigeradores_id
      LEFT JOIN usuarios u ON u.id=m.usuarios_id
      ${where} ORDER BY m.creado_en DESC,m.id DESC LIMIT ? OFFSET ?`, [...parametros, limite, offset]);
    const total = Number(conteo.total);
    return { status: 200, body: { mensaje: 'Mermas consultadas correctamente.', datos,
      paginacion: { pagina, limite, total, total_paginas: Math.ceil(total / limite) } } };
  }, true);
};

exports.obtenerMotivos = async (req, res) => conConexion(res, async conexion => {
  const [datos] = await conexion.query('SELECT id,nombre FROM merma_motivos ORDER BY nombre ASC,id ASC');
  return { status: 200, body: { mensaje: 'Motivos consultados correctamente.', datos } };
}, true);

// Catálogo mínimo para registrar mermas; no expone CRUD de refrigeradores.
exports.obtenerRefrigeradores = async (req, res) => conConexion(res, async conexion => {
  const [datos] = await conexion.query('SELECT id,nombre,estado FROM refrigeradores WHERE deleted_at IS NULL ORDER BY nombre ASC,id ASC');
  return { status: 200, body: { mensaje: 'Refrigeradores consultados correctamente.', datos, total: datos.length } };
}, true);
