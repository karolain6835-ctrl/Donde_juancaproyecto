const crypto = require('crypto');
const fallo = (status, message) => Object.assign(new Error(message), { status });
function validarParticipante(body) {
  if (!body || !['registrado', 'temporal'].includes(body.tipo_participante)) throw fallo(400, 'Tipo de participante inválido.');
  if (body.tipo_participante === 'registrado') {
    if (typeof body.clientes_id !== 'string' || !body.clientes_id.trim() || body.clientes_id.length > 36) throw fallo(400, 'Selecciona un cliente real.');
    return { tipo_participante: 'registrado', clientes_id: body.clientes_id };
  }
  if (typeof body.nombre !== 'string' || !body.nombre.trim() || [...body.nombre.trim()].length > 100) throw fallo(400, 'Nombre o alias obligatorio, máximo 100 caracteres.');
  return { tipo_participante: 'temporal', nombre: body.nombre.trim(), clientes_id: null };
}
async function insertarParticipante(c, pedido, input, reutilizar = false) {
  const data = validarParticipante(input);
  if (data.clientes_id) {
    const [[cliente]] = await c.query('SELECT nombre,estado FROM clientes WHERE id=? LOCK IN SHARE MODE', [data.clientes_id]);
    if (!cliente) throw fallo(404, 'Cliente no encontrado.');
    if (cliente.estado !== 'activo') throw fallo(409, 'No puede asociarse un cliente inactivo al pedido.');
    data.nombre = cliente.nombre;
  }
  if (data.clientes_id) {
    const columna = pedido.sesion_mesa_id ? 'sesion_mesa_id' : 'pedido_id';
    const [[existing]] = await c.query(`SELECT id,nombre,tipo_participante,clientes_id,pedido_id,sesion_mesa_id FROM jugadores WHERE ${columna}=? AND clientes_id=? FOR UPDATE`, [pedido.sesion_mesa_id || pedido.id, data.clientes_id]);
    if (existing) {
      if (reutilizar) return existing;
      throw fallo(409, 'Este cliente ya está asociado a la visita o pedido.');
    }
  }
  const participante = { id: crypto.randomUUID(), pedido_id: pedido.sesion_mesa_id ? null : pedido.id, sesion_mesa_id: pedido.sesion_mesa_id || null, ...data };
  await c.query('INSERT INTO jugadores(id,nombre,creado_en,mesas_id,pedido_id,clientes_id,tipo_participante,sesion_mesa_id) VALUES (?,?,UTC_TIMESTAMP(),?,?,?,?,?)',
    [participante.id, data.nombre, pedido.mesas_id, participante.pedido_id, data.clientes_id, data.tipo_participante, participante.sesion_mesa_id]);
  return participante;
}
async function listarParticipantes(c, ambito) {
  const columna = ambito.sesion_mesa_id ? 'sesion_mesa_id' : 'pedido_id';
  const [rows] = await c.query(`SELECT id,nombre,tipo_participante,clientes_id,pedido_id,sesion_mesa_id FROM jugadores WHERE ${columna}=? ORDER BY creado_en,id`, [ambito.sesion_mesa_id || ambito.id]);
  return rows;
}
module.exports = { validarParticipante, insertarParticipante, listarParticipantes, fallo };
