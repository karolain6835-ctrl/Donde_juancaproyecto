// Los importes se operan en centavos enteros, sin redondeos de coma flotante.
const { cerrarSesion, asegurarSesion } = require('./sesionesMesaService');
const errorLiquidacion = (status, mensaje) => Object.assign(new Error(mensaje), { status });
const centavos = (valor) => {
  const texto = String(valor);
  if (!/^\d+(\.\d{1,2})?$/.test(texto)) {
    throw errorLiquidacion(409, 'La cuenta contiene un importe inválido.');
  }
  const [entero, decimal = ''] = texto.split('.');
  return BigInt(entero) * 100n + BigInt(decimal.padEnd(2, '0'));
};
const dinero = (valor) => `${valor / 100n}.${String(valor % 100n).padStart(2, '0')}`;
const esValido = p => p.verificacion_estado === 'verificado' && p.estado === 'pagado';
const esPendiente = p => p.verificacion_estado === 'pendiente' && p.estado === 'pendiente';

const bloquearPedido = async (conexion, pedidoId) => {
  // Localizar sin bloquear y luego respetar el orden mesa -> pedido del traslado.
  const [ubicacion] = await conexion.query('SELECT mesas_id FROM pedidos WHERE id = ?', [pedidoId]);
  if (!ubicacion.length) throw errorLiquidacion(404, 'El pedido no existe.');
  const [mesas] = await conexion.query('SELECT id FROM mesas WHERE id = ? FOR UPDATE', [ubicacion[0].mesas_id]);
  if (!mesas.length) throw errorLiquidacion(409, 'La mesa del pedido no existe.');
  const [pedidos] = await conexion.query('SELECT id, mesas_id, estado FROM pedidos WHERE id = ? FOR UPDATE', [pedidoId]);
  if (!pedidos.length || pedidos[0].mesas_id !== mesas[0].id) {
    throw errorLiquidacion(409, 'El pedido cambió de mesa. Reintenta la operación.');
  }
  if (pedidos[0].estado === 'cancelado') throw errorLiquidacion(409, 'El pedido está cancelado.');
  return pedidos[0];
};

const calcularCuenta = async (conexion, pedido) => {
  const [items] = await conexion.query(`
    SELECT id, pedido_id, pedidos_id, estado,
           CAST(cantidad_pedida * precio_unitario AS DECIMAL(20,2)) AS subtotal
    FROM pedido_items WHERE pedido_id = ? OR pedidos_id = ? FOR UPDATE
  `, [pedido.id, pedido.id]);
  // No asignar deuda a dos pedidos si las columnas heredadas discrepan.
  if (items.some(i => i.pedido_id !== pedido.id || i.pedidos_id !== pedido.id)) {
    throw errorLiquidacion(409, 'Hay ítems con referencias de pedido inconsistentes.');
  }
  const [juegos] = await conexion.query(`
    SELECT sj.id, sj.estado, sj.costo_total
    FROM sesiones_juego sj
    WHERE sj.estado != 'cancelada' AND EXISTS (
      SELECT 1 FROM pedido_items pi WHERE pi.id = sj.pedido_items_id
      AND pi.pedidos_id = ? AND pi.estado != 'cancelado'
    ) FOR UPDATE
  `, [pedido.id]);
  const [pagos] = await conexion.query(`
    SELECT id, total_seleccionado, estado, verificacion_estado
    FROM pagos WHERE pedidos_id = ? FOR UPDATE
  `, [pedido.id]);
  // Misma separación de consumos que la cuenta: ítems + costo registrado de juegos.
  const productos = items.filter(i => i.estado !== 'cancelado').reduce((a, i) => a + centavos(i.subtotal), 0n);
  const totalJuegos = juegos.reduce((a, j) => a + (j.costo_total === null ? 0n : centavos(j.costo_total)), 0n);
  const total = productos + totalJuegos;
  const pagado = pagos.filter(esValido).reduce((a, p) => a + centavos(p.total_seleccionado), 0n);
  const pendienteVerificacion = pagos.filter(esPendiente).reduce((a, p) => a + centavos(p.total_seleccionado), 0n);
  if (pagado > total) throw errorLiquidacion(409, 'Los pagos verificados superan el total actual de la cuenta. Requiere conciliación.');
  return {
    productos, juegos: totalJuegos, total, pagado, pendienteVerificacion,
    saldo: total - pagado,
    totalDefinitivo: juegos.every(j => j.estado === 'cerrada' && j.costo_total !== null),
    pagos
  };
};

const validarImporte = (cuenta, importe) => {
  if (importe > cuenta.saldo - cuenta.pendienteVerificacion) {
    throw errorLiquidacion(409, 'El importe supera el saldo disponible considerando pagos pendientes de verificación.');
  }
};

// El llamador bloquea primero la mesa. Reutiliza el cálculo real, no los totales cacheados.
const evaluarLiberacionMesa = async (conexion, mesaId) => {
  const [pedidos] = await conexion.query("SELECT id,estado FROM pedidos WHERE mesas_id=? AND estado!='cancelado' ORDER BY id FOR UPDATE", [mesaId]);
  if (pedidos.some(p => p.estado === 'abierto')) return { puede_liberarse: false, motivo: 'No se puede liberar la mesa: tiene pedidos abiertos.' };
  const [juegos] = await conexion.query("SELECT id FROM sesiones_juego WHERE mesas_id=? AND estado='activa' FOR UPDATE", [mesaId]);
  if (juegos.length) return { puede_liberarse: false, motivo: 'No se puede liberar la mesa: tiene una sesión de juego activa.' };
  for (const pedido of pedidos) {
    const cuenta = await calcularCuenta(conexion, pedido);
    if (cuenta.saldo > 0n) return { puede_liberarse: false, motivo: 'No se puede liberar la mesa: tiene saldo pendiente.' };
    if (cuenta.pendienteVerificacion > 0n) return { puede_liberarse: false, motivo: 'No se puede liberar la mesa: tiene pagos pendientes de verificación.' };
    if (!cuenta.totalDefinitivo) return { puede_liberarse: false, motivo: 'No se puede liberar la mesa: la cuenta de juegos aún no tiene un total definitivo.' };
  }
  return { puede_liberarse: true, motivo: null };
};

const actualizarLiquidacion = async (conexion, pedido, cuenta) => {
  const liquidada = cuenta.saldo === 0n && cuenta.pendienteVerificacion === 0n && cuenta.totalDefinitivo;
  const estadoPedido = liquidada ? 'cerrado' : pedido.estado;
  if (pedido.estado === 'cerrado' && !liquidada) {
    throw errorLiquidacion(409, 'El pedido cerrado no coincide con sus consumos y pagos. Requiere conciliación.');
  }
  const [actualizacion] = await conexion.query(`
    UPDATE pedidos SET total_productos = ?, total_juegos = ?, total_general = ?, estado = ? WHERE id = ?
  `, [dinero(cuenta.productos), dinero(cuenta.juegos), dinero(cuenta.total), estadoPedido, pedido.id]);
  if (actualizacion.affectedRows !== 1) throw new Error('No se actualizó el pedido.');
  if (liquidada) {
    // Un pago monetario parcial no identifica qué unidades de producto se pagaron.
    await conexion.query(`UPDATE pedido_items SET cantidad_pagada = cantidad_pedida
      WHERE pedidos_id = ? AND estado != 'cancelado'`, [pedido.id]);
  }
  const [abiertos] = await conexion.query(
    "SELECT id FROM pedidos WHERE mesas_id = ? AND estado = 'abierto' FOR UPDATE", [pedido.mesas_id]
  );
  const [juegosActivos] = await conexion.query(
    "SELECT id FROM sesiones_juego WHERE mesas_id = ? AND estado = 'activa' FOR UPDATE", [pedido.mesas_id]
  );
  let liberable = false;
  let motivo = abiertos.length ? 'Hay otro pedido pendiente o este pedido sigue abierto.'
    : juegosActivos.length ? 'Hay un juego activo.' : null;
  if (!abiertos.length && !juegosActivos.length) {
    try { const evaluacion = await evaluarLiberacionMesa(conexion, pedido.mesas_id); liberable = evaluacion.puede_liberarse; motivo = evaluacion.motivo; }
    catch (error) { if (error.status !== 409) throw error; motivo = error.message; } // Una cuenta inconsistente conserva la mesa protegida.
  }
  if (cuenta.pendienteVerificacion > 0n) motivo = 'Hay un pago pendiente de verificación.';
  else if (!cuenta.totalDefinitivo) motivo = juegosActivos.length ? 'Hay un juego activo.' : 'La cuenta de juegos aún no tiene un total definitivo.';
  const estadoMesa = liberable ? 'disponible' : 'en_cobro';
  const [mesa] = await conexion.query('UPDATE mesas SET estado = ? WHERE id = ?', [estadoMesa, pedido.mesas_id]);
  if (mesa.affectedRows !== 1) throw new Error('No se actualizó la mesa.');
  // Sin cambiar pagos ni importes: sincronizar el ámbito cuando esta operación cambia la mesa.
  if (liberable) await cerrarSesion(conexion, pedido.mesas_id);
  else await asegurarSesion(conexion, pedido.mesas_id);
  return {
    pedido_id: pedido.id,
    total_cuenta: dinero(cuenta.total),
    total_pagado: dinero(cuenta.pagado),
    pagos_pendientes_verificacion: dinero(cuenta.pendienteVerificacion),
    saldo_pendiente: dinero(cuenta.saldo),
    total_definitivo: cuenta.totalDefinitivo,
    cuenta_liquidada: liquidada,
    estado_pedido: estadoPedido,
    estado_mesa: estadoMesa,
    estado_sesion: liberable ? 'cerrada' : 'activa',
    motivo_no_liberacion: motivo
  };
};

const validarParticipante = async (conexion, participanteId, importe = 0n) => {
  const [participantes] = await conexion.query(
    'SELECT id, total_asignado FROM division_participantes WHERE id = ? FOR UPDATE', [participanteId]
  );
  if (!participantes.length) throw errorLiquidacion(404, 'El participante no existe.');
  const [pagos] = await conexion.query(
    'SELECT total_seleccionado, estado, verificacion_estado FROM pagos WHERE participante_id = ? FOR UPDATE', [participanteId]
  );
  const asignado = centavos(participantes[0].total_asignado);
  const reservado = pagos.filter(p => esValido(p) || esPendiente(p)).reduce((a, p) => a + centavos(p.total_seleccionado), 0n);
  if (reservado + importe > asignado) throw errorLiquidacion(409, 'Los pagos del participante superan su total asignado.');
  const pagado = pagos.filter(esValido).reduce((a, p) => a + centavos(p.total_seleccionado), 0n);
  await conexion.query('UPDATE division_participantes SET estado = ? WHERE id = ?',
    [pagado === asignado ? 'pagado' : 'pendiente', participanteId]);
};

module.exports = { bloquearPedido, calcularCuenta, validarImporte, actualizarLiquidacion,
  evaluarLiberacionMesa, validarParticipante, errorLiquidacion, centavos };
