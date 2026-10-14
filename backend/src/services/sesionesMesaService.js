const { randomUUID } = require('crypto');
const fallo = (status, message) => Object.assign(new Error(message), { status });
// El llamador bloquea la mesa antes de resolver/crear/cerrar su visita.
async function sesionActiva(c, mesaId) {
  const [[sesion]] = await c.query('SELECT id,mesas_id,estado,iniciada_en,cerrada_en FROM sesiones_mesa WHERE mesa_activa=? FOR UPDATE', [mesaId]);
  return sesion || null;
}
async function asegurarSesion(c, mesaId) {
  const existing = await sesionActiva(c, mesaId);
  if (existing) return existing;
  const id = randomUUID();
  await c.query("INSERT INTO sesiones_mesa(id,mesas_id,estado,iniciada_en) VALUES (?,?,'activa',UTC_TIMESTAMP())", [id,mesaId]);
  return { id, mesas_id: mesaId, estado: 'activa' };
}
async function cerrarSesion(c, mesaId) {
  await c.query("UPDATE sesiones_mesa SET estado='cerrada',cerrada_en=UTC_TIMESTAMP() WHERE mesa_activa=?", [mesaId]);
}
async function bloquearAmbitoPedido(c, id) {
  const [[ubicacion]] = await c.query('SELECT mesas_id,sesion_mesa_id FROM pedidos WHERE id=?', [id]);
  if (!ubicacion) throw fallo(404, 'Pedido no encontrado.');
  if (!ubicacion.sesion_mesa_id) {
    const [[legacy]] = await c.query('SELECT id,mesas_id,estado,usuarios_id,sesion_mesa_id FROM pedidos WHERE id=? FOR UPDATE', [id]);
    if (!legacy || legacy.sesion_mesa_id) throw fallo(409, 'El ámbito del pedido cambió. Reintenta.');
    return legacy;
  }
  const [[mesa]] = await c.query('SELECT id FROM mesas WHERE id=? FOR UPDATE', [ubicacion.mesas_id]);
  if (!mesa) throw fallo(409, 'Mesa del pedido no encontrada.');
  const [[pedido]] = await c.query('SELECT id,mesas_id,estado,usuarios_id,sesion_mesa_id FROM pedidos WHERE id=? FOR UPDATE', [id]);
  if (!pedido || pedido.mesas_id !== mesa.id) throw fallo(409, 'El pedido cambió de mesa. Reintenta.');
  return pedido;
}
async function validarSesionPedido(c, pedido) {
  if (!pedido.sesion_mesa_id) return;
  const [[sesion]] = await c.query('SELECT id,mesas_id,estado FROM sesiones_mesa WHERE id=? FOR UPDATE', [pedido.sesion_mesa_id]);
  if (!sesion || sesion.estado !== 'activa' || sesion.mesas_id !== pedido.mesas_id) throw fallo(409, 'La visita del pedido ya no está activa en esta mesa.');
}
module.exports = { sesionActiva, asegurarSesion, cerrarSesion, bloquearAmbitoPedido, validarSesionPedido };
