const { ejecutor } = require('../services/identidadService');
const mysql = require('mysql2');
const db = require('../config/db');
const { randomUUID } = require('node:crypto');
const { calcularCosto } = require('../services/juegosService');

const fallo = (status, mensaje) => Object.assign(new Error(mensaje), { status });
const idValido = id => typeof id === 'string' && id.length > 0 && id.length <= 36 && id.trim() === id;
const escrito = resultado => {
  if (resultado.affectedRows !== 1) throw new Error('La escritura no afectó exactamente una fila.');
};
const campos = (body, nombres) => {
  if (!body || typeof body !== 'object' || Array.isArray(body) ||
      Object.keys(body).some(k => !nombres.includes(k)) || nombres.some(k => !idValido(body[k]))) {
    throw fallo(400, `Envía únicamente los campos obligatorios: ${nombres.join(', ')}.`);
  }
};
const ejecutar = async (res, operacion, transaccion = false) => {
  let conexion, abierta = false;
  try {
    conexion = mysql.createConnection(db.dbConfig).promise();
    if (transaccion) { await conexion.beginTransaction(); abierta = true; }
    const respuesta = await operacion(conexion);
    if (abierta) { await conexion.commit(); abierta = false; }
    return res.status(respuesta.status || 200).json(respuesta.body);
  } catch (error) {
    if (abierta) {
      try { await conexion.rollback(); } catch (e) { console.error('Rollback de juegos:', e.message); }
    }
    if (!error.status) console.error('Error de juegos:', error.message);
    return res.status(error.status || 500).json({ error: error.status ? error.message : 'No se pudo completar la operación de juegos.' });
  } finally {
    if (conexion) {
      try { await conexion.end(); } catch (e) { console.error('Cierre de conexión de juegos:', e.message); }
    }
  }
};
const consultaSesion = `SELECT s.id,s.tipo_juego,s.estado,CAST(s.costo_total AS CHAR) AS costo_total,
  DATE_FORMAT(s.fecha_inicio,'%Y-%m-%dT%H:%i:%sZ') AS fecha_inicio,
  DATE_FORMAT(s.fecha_fin,'%Y-%m-%dT%H:%i:%sZ') AS fecha_fin,
  CAST(s.tarifa_hora_aplicada AS CHAR) AS tarifa_hora_aplicada,
  s.activos_juego_id,a.nombre AS activo_nombre,s.mesas_id,s.iniciada_por,s.cerrada_por,s.pedido_items_id
  FROM sesiones_juego s LEFT JOIN activos_juego a ON a.id=s.activos_juego_id`;
const filtro = (query, permitidos) => {
  if (query.estado !== undefined && !permitidos.includes(query.estado)) throw fallo(400, 'Estado no válido.');
  return query.estado === undefined ? [] : [query.estado];
};
exports.listarActivos = (req, res) => ejecutar(res, async c => {
  const valores = filtro(req.query, ['disponible', 'ocupado', 'mantenimiento']);
  const [datos] = await c.query(`SELECT id,nombre,estado,tipo,CAST(precio_hora AS CHAR) AS precio_hora
    FROM activos_juego ${valores.length ? 'WHERE estado=?' : ''} ORDER BY id`, valores);
  return { body: { mensaje: 'Activos consultados correctamente.', datos } };
});
exports.listarSesiones = (req, res) => ejecutar(res, async c => {
  const valores = filtro(req.query, ['activa', 'cerrada', 'cancelada']);
  const [datos] = await c.query(`${consultaSesion} ${valores.length ? 'WHERE s.estado=?' : ''}
    ORDER BY s.fecha_inicio DESC,s.id DESC`, valores);
  return { body: { mensaje: 'Sesiones consultadas correctamente.', datos } };
});
exports.iniciarJuego = (req, res) => {
  const actor = ejecutor(req, res, ['iniciada_por', 'usuarios_id']);
  if (!actor) return;
  return ejecutar(res, async c => {
    campos(req.body, ['activos_juego_id', 'mesas_id', 'pedido_items_id']);
    const b = req.body;
    const [[mesa]] = await c.query('SELECT id,estado FROM mesas WHERE id=? FOR UPDATE', [b.mesas_id]);
    if (!mesa) throw fallo(404, 'Mesa inexistente.');
    const [[activo]] = await c.query('SELECT id,estado,tipo,CAST(precio_hora AS CHAR) AS precio_hora FROM activos_juego WHERE id=? FOR UPDATE', [b.activos_juego_id]);
    if (!activo) throw fallo(404, 'Activo inexistente.');
    if (activo.estado !== 'disponible') throw fallo(409, 'El activo no está disponible.');
    const [activas] = await c.query("SELECT id FROM sesiones_juego WHERE activos_juego_id=? AND estado='activa' FOR UPDATE", [activo.id]);
    if (activas.length) throw fallo(409, 'El activo ya tiene una sesión activa.');
    const [[usuario]] = await c.query('SELECT id FROM usuarios WHERE id=? LOCK IN SHARE MODE', [actor]);
    if (!usuario) throw fallo(404, 'Usuario inexistente.');
    const [[item]] = await c.query(`SELECT pi.id,p.mesas_id FROM pedido_items pi
      JOIN pedidos p ON p.id=pi.pedidos_id WHERE pi.id=? LOCK IN SHARE MODE`, [b.pedido_items_id]);
    if (!item) throw fallo(404, 'Ítem inexistente.');
    if (item.mesas_id !== b.mesas_id) throw fallo(400, 'El ítem pertenece a otra mesa.');
    calcularCosto(activo.precio_hora, 0);
    const id = randomUUID();
    const [insert] = await c.query(`INSERT INTO sesiones_juego
      (id,tipo_juego,estado,costo_total,activos_juego_id,mesas_id,iniciada_por,cerrada_por,pedido_items_id,fecha_inicio,fecha_fin,tarifa_hora_aplicada)
      VALUES (?,?,'activa',NULL,?,?,?,NULL,?,UTC_TIMESTAMP(),NULL,?)`,
    [id, activo.tipo, activo.id, b.mesas_id, actor, b.pedido_items_id, activo.precio_hora]);
    escrito(insert);
    const [update] = await c.query("UPDATE activos_juego SET estado='ocupado' WHERE id=? AND estado='disponible'", [activo.id]);
    escrito(update);
    if (mesa.estado === 'disponible') escrito((await c.query("UPDATE mesas SET estado='ocupada' WHERE id=?", [mesa.id]))[0]);
    const [[datos]] = await c.query(`${consultaSesion} WHERE s.id=?`, [id]);
    return { status: 201, body: { mensaje: 'Sesión de juego iniciada correctamente.', id_sesion: id, datos } };
  }, true);
};
exports.terminarJuego = (req, res) => {
  const actor = ejecutor(req, res, ['cerrada_por', 'usuarios_id']);
  if (!actor) return;
  return ejecutar(res, async c => {
    campos(req.body || {}, []);
    if (!idValido(req.params.id)) throw fallo(400, 'ID de sesión no válido.');
    const [[sesion]] = await c.query(`SELECT id,estado,fecha_inicio,CAST(tarifa_hora_aplicada AS CHAR) AS tarifa_hora_aplicada,
      activos_juego_id FROM sesiones_juego WHERE id=? FOR UPDATE`, [req.params.id]);
    if (!sesion) throw fallo(404, 'Sesión inexistente.');
    if (sesion.estado !== 'activa') throw fallo(409, 'La sesión no está activa.');
    if (sesion.fecha_inicio === null || sesion.tarifa_hora_aplicada === null) throw fallo(409, 'La sesión histórica requiere conciliación de fecha de inicio y tarifa.');
    const [[usuario]] = await c.query('SELECT id FROM usuarios WHERE id=? LOCK IN SHARE MODE', [actor]);
    if (!usuario) throw fallo(404, 'Usuario inexistente.');
    const [[activo]] = await c.query('SELECT id FROM activos_juego WHERE id=? FOR UPDATE', [sesion.activos_juego_id]);
    if (!activo) throw fallo(409, 'La sesión no tiene un activo válido.');
    const [[tiempo]] = await c.query(`SELECT DATE_FORMAT(UTC_TIMESTAMP(),'%Y-%m-%d %H:%i:%s') AS fecha_fin,
      TIMESTAMPDIFF(SECOND,fecha_inicio,UTC_TIMESTAMP()) AS segundos FROM sesiones_juego WHERE id=?`, [sesion.id]);
    const costo = calcularCosto(sesion.tarifa_hora_aplicada, tiempo.segundos);
    const [update] = await c.query(`UPDATE sesiones_juego SET estado='cerrada',fecha_fin=?,cerrada_por=?,costo_total=?
      WHERE id=? AND estado='activa'`, [tiempo.fecha_fin, actor, costo, sesion.id]);
    escrito(update);
    const [liberar] = await c.query("UPDATE activos_juego SET estado='disponible' WHERE id=?", [activo.id]);
    escrito(liberar);
    const [[datos]] = await c.query(`${consultaSesion} WHERE s.id=?`, [sesion.id]);
    return { body: { mensaje: 'Sesión de juego finalizada correctamente.', id_sesion: sesion.id, total_cobrado: costo, datos } };
  }, true);
};
