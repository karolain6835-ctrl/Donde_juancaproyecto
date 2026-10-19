const db = require('../config/db');
const mysql = require('mysql2');
const { insertarParticipante, validarParticipante, listarParticipantes, fallo } = require('../services/participantesService');
const { bloquearAmbitoPedido, validarSesionPedido } = require('../services/sesionesMesaService');
async function operar(req, res, agregar) {
  let c, abierta = false;
  try {
    if (agregar) validarParticipante(req.body);
    c = mysql.createConnection(db.dbConfig).promise();
    await c.beginTransaction(); abierta = true;
    const pedido = await bloquearAmbitoPedido(c, req.params.id);
    let datos;
    if (agregar) {
      if (pedido.estado !== 'abierto') throw fallo(409, 'Solo se pueden agregar participantes a un pedido abierto.');
      await validarSesionPedido(c, pedido);
      datos = await insertarParticipante(c, pedido, req.body);
    } else {
      datos = await listarParticipantes(c, pedido);
    }
    await c.commit(); abierta = false;
    return res.status(agregar ? 201 : 200).json({ datos });
  } catch (error) {
    if (abierta) { try { await c.rollback(); } catch (rollback) { console.error('Rollback participante:', new Error('Fallo interno; detalles sensibles omitidos.').stack); } }
    const concurrente = ['ER_LOCK_DEADLOCK', 'ER_LOCK_WAIT_TIMEOUT'].includes(error.code);
    return res.status(error.status || (error.code === 'ER_DUP_ENTRY' || concurrente ? 409 : 500)).json({ error: error.status ? error.message : error.code === 'ER_DUP_ENTRY' ? 'Este participante ya está asociado al pedido.' : concurrente ? 'Conflicto concurrente al guardar participantes. Reintenta.' : 'No se pudieron consultar o guardar los participantes.' });
  } finally { if (c) { try { await c.end(); } catch (error) { console.error('Cierre participante:', new Error('Fallo interno; detalles sensibles omitidos.').stack); } } }
}
exports.listar = (req, res) => operar(req, res, false);
exports.agregar = (req, res) => operar(req, res, true);
