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
async function insertarParticipante(c, pedido, input) {
  const data = validarParticipante(input);
  if (data.clientes_id) {
    const [[cliente]] = await c.query('SELECT nombre,estado FROM clientes WHERE id=? LOCK IN SHARE MODE', [data.clientes_id]);
    if (!cliente) throw fallo(404, 'Cliente no encontrado.');
    if (cliente.estado !== 'activo') throw fallo(409, 'No puede asociarse un cliente inactivo al pedido.');
    data.nombre = cliente.nombre;
  }
  if (data.clientes_id) {
    const [[existing]] = await c.query('SELECT id FROM jugadores WHERE pedido_id=? AND clientes_id=? FOR UPDATE', [pedido.id, data.clientes_id]);
    if (existing) throw fallo(409, 'Este cliente ya está asociado al pedido.');
  }
  const participante = { id: crypto.randomUUID(), pedido_id: pedido.id, ...data };
  await c.query('INSERT INTO jugadores(id,nombre,creado_en,mesas_id,pedido_id,clientes_id,tipo_participante) VALUES (?,?,UTC_TIMESTAMP(),?,?,?,?)',
    [participante.id, data.nombre, pedido.mesas_id, pedido.id, data.clientes_id, data.tipo_participante]);
  return participante;
}
module.exports = { validarParticipante, insertarParticipante, fallo };
