const mysql = require('mysql2');
const db = require('../config/db');
const { sesionActiva } = require('../services/sesionesMesaService');
const { fallo, validarParticipante, insertarParticipante, listarParticipantes } = require('../services/participantesService');
const { centavos } = require('../services/liquidacionService');
const dinero = n => `${n / 100n}.${String(n % 100n).padStart(2, '0')}`;
async function operar(req, res, modo) {
  let c, abierta = false;
  try {
    if (modo === 'agregar') validarParticipante(req.body);
    c = mysql.createConnection(db.dbConfig).promise();
    await c.beginTransaction(); abierta = true;
    let datos, sesion;
    if (modo === 'consumos') {
      const [[person]] = await c.query('SELECT id,nombre,tipo_participante,clientes_id,sesion_mesa_id FROM jugadores WHERE id=? AND sesion_mesa_id=?', [req.params.participante_id, req.params.sesion_id]);
      if (!person) throw fallo(404, 'Participante no encontrado en esta visita.');
      const [items] = await c.query(`SELECT pi.id,pi.pedidos_id,pi.participante_id,pi.productos_id,p.nombre,
        pi.cantidad_pedida,pi.precio_unitario,pi.estado,CAST(pi.cantidad_pedida*pi.precio_unitario AS DECIMAL(20,2)) AS subtotal
        FROM pedido_items pi JOIN pedidos ped ON ped.id=pi.pedidos_id
        JOIN productos p ON p.id=pi.productos_id
        WHERE ped.sesion_mesa_id=? AND pi.participante_id=? AND ped.estado<>'cancelado' AND pi.estado<>'cancelado'
        ORDER BY ped.creado_en,ped.id,pi.id`, [person.sesion_mesa_id, person.id]);
      const groups = new Map(); let total = 0n;
      for (const item of items) {
        const sum = centavos(item.subtotal); total += sum;
        const group = groups.get(item.productos_id) || { productos_id: item.productos_id, producto: item.nombre, cantidad_total: 0, subtotal: 0n };
        group.cantidad_total += item.cantidad_pedida; group.subtotal += sum; groups.set(item.productos_id, group);
      }
      datos = { sesion_mesa_id: person.sesion_mesa_id, participante: person, items,
        resumen_productos: [...groups.values()].map(({ subtotal, ...group }) => ({ ...group, subtotal_total: dinero(subtotal) })), total_consumido: dinero(total) };
    } else {
      const [[mesa]] = await c.query('SELECT id,estado FROM mesas WHERE id=? FOR UPDATE', [req.params.id]);
      if (!mesa) throw fallo(404, 'Mesa no encontrada.');
      sesion = await sesionActiva(c, mesa.id);
      if (modo === 'agregar') {
        if (!sesion || mesa.estado === 'disponible') throw fallo(409, 'No hay una visita activa. Ocupa la mesa o crea un pedido primero.');
        datos = await insertarParticipante(c, { mesas_id: mesa.id, sesion_mesa_id: sesion.id }, req.body);
      } else datos = sesion ? await listarParticipantes(c, { sesion_mesa_id: sesion.id }) : [];
    }
    await c.commit(); abierta = false;
    return res.status(modo === 'agregar' ? 201 : 200).json({ datos, ...(modo !== 'consumos' ? { sesion } : {}) });
  } catch (error) {
    if (abierta) { try { await c.rollback(); } catch (rollback) { console.error('Rollback visita:', rollback.message); } }
    const conflicto = ['ER_DUP_ENTRY','ER_LOCK_WAIT_TIMEOUT','ER_LOCK_DEADLOCK'].includes(error.code);
    return res.status(error.status || (conflicto ? 409 : 500)).json({ error: error.status ? error.message : conflicto ? 'Conflicto concurrente en la visita. Reintenta.' : 'No se pudo consultar o actualizar la visita.' });
  } finally { if (c) { try { await c.end(); } catch (error) { console.error('Cierre visita:', error.message); } } }
}
exports.listar = (req,res) => operar(req,res,'listar');
exports.agregar = (req,res) => operar(req,res,'agregar');
exports.consumos = (req,res) => operar(req,res,'consumos');
