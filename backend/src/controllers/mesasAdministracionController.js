const crypto = require('crypto');
const mysql = require('mysql2');
const db = require('../config/db');
const { ejecutor } = require('../services/identidadService');
const { registrarAuditoria } = require('../services/auditoriaService');
const fallo = (status, message) => Object.assign(new Error(message), { status });
async function guardar(req, res, editar) {
  const actor = ejecutor(req, res); if (!actor) return;
  const body = req.body || {}, numero = body.numero;
  if (Object.keys(body).some(k => k !== 'numero') || !Number.isInteger(numero) || numero < 1 || numero > 2147483647) return res.status(400).json({ error: 'El número de mesa debe ser un entero mayor que cero.' });
  let c, abierta = false, bloqueo = false;
  try {
    c = mysql.createConnection(db.dbConfig).promise();
    // La restricción UNIQUE de la BD respalda la validación de esta API.
    // Serializar altas/renumeraciones de esta API incluso con varias instancias.
    const [[lock]] = await c.query("SELECT GET_LOCK(CONCAT('dj:mesas:',LEFT(SHA2(DATABASE(),256),40)),5) AS adquirido");
    if (Number(lock.adquirido) !== 1) throw fallo(409, 'Otra mesa se está guardando. Reintenta.');
    bloqueo = true;
    await c.beginTransaction(); abierta = true;
    let anterior;
    if (editar) {
      [[anterior]] = await c.query('SELECT id,numero,estado FROM mesas WHERE id=? FOR UPDATE', [req.params.id]);
      if (!anterior) throw fallo(404, 'Mesa no encontrada.');
    }
    const id = editar ? anterior.id : crypto.randomUUID();
    const [[duplicada]] = await c.query('SELECT id FROM mesas WHERE numero=? AND id<>? LIMIT 1 FOR UPDATE', [numero, id]);
    if (duplicada) throw fallo(409, `Ya existe una mesa con el número ${numero}.`);
    if (editar) await c.query('UPDATE mesas SET numero=? WHERE id=?', [numero, id]);
    else await c.query("INSERT INTO mesas(id,numero,estado,creado_en) VALUES (?,?,'disponible',UTC_TIMESTAMP())", [id, numero]);
    if (!editar || anterior.numero !== numero) await registrarAuditoria(c, actor, 'mesas', editar ? 'mesa_numero_cambiado' : 'mesa_creada', 'mesas', id, { antes: editar ? { numero: anterior.numero } : null, despues: { numero } });
    const [[mesa]] = await c.query('SELECT id,numero,estado FROM mesas WHERE id=?', [id]);
    await c.commit(); abierta = false;
    return res.status(editar ? 200 : 201).json({ datos: mesa });
  } catch (error) {
    if (abierta) { try { await c.rollback(); } catch (rollback) { console.error('Rollback mesa:', new Error('Fallo interno; detalles sensibles omitidos.').stack); } }
    return res.status(error.status || (['ER_DUP_ENTRY','ER_LOCK_DEADLOCK','ER_LOCK_WAIT_TIMEOUT'].includes(error.code) ? 409 : 500)).json({ error: error.status ? error.message : error.code === 'ER_DUP_ENTRY' ? `Ya existe una mesa con el número ${numero}.` : 'No se pudo guardar la mesa. Reintenta.' });
  } finally {
    if (c) {
      try { if (bloqueo) await c.query("SELECT RELEASE_LOCK(CONCAT('dj:mesas:',LEFT(SHA2(DATABASE(),256),40)))"); }
      catch (error) { console.error('Liberación de bloqueo de mesas:', new Error('Fallo interno; detalles sensibles omitidos.').stack); }
      finally { try { await c.end(); } catch (error) { console.error('Cierre de mesas:', new Error('Fallo interno; detalles sensibles omitidos.').stack); } }
    }
  }
}
exports.crear = (req, res) => guardar(req, res, false);
exports.editarNumero = (req, res) => guardar(req, res, true);
