const mysql = require('mysql2');
const db = require('../config/db');
const { randomUUID } = require('node:crypto');
const { bloquearPedido, calcularCuenta, centavos, errorLiquidacion } = require('./liquidacionService');

const error = errorLiquidacion;
const id = valor => {
  if (typeof valor !== 'string' || !valor || valor.length > 36 || valor.trim() !== valor) throw error(400, 'ID inválido.');
  return valor;
};
const dinero = valor => {
  if (valor < 0n || valor > 999999999999n) throw error(409, 'Importe fuera de DECIMAL(12,2).');
  return `${valor / 100n}.${String(valor % 100n).padStart(2, '0')}`;
};
const escrito = r => { if (r.affectedRows !== 1) throw new Error('No se escribió exactamente una fila.'); };
const cabecera = `SELECT id,CAST(numero AS CHAR) AS numero,pedidos_id,clientes_id,cliente_nombre,usuarios_id,
  DATE_FORMAT(emitido_en,'%Y-%m-%dT%H:%i:%sZ') AS emitido_en,
  CAST(total_productos AS CHAR) AS total_productos,CAST(total_juegos AS CHAR) AS total_juegos,
  CAST(total_general AS CHAR) AS total_general,CAST(total_pagado AS CHAR) AS total_pagado FROM comprobantes`;
const detalle = async (c, comprobanteId) => {
  const [[comprobante]] = await c.query(`${cabecera} WHERE id=?`, [comprobanteId]);
  if (!comprobante) throw error(404, 'Comprobante inexistente.');
  const [items] = await c.query(`SELECT id,comprobantes_id,renglon,tipo,referencia_id,descripcion,cantidad,
    CAST(precio_unitario AS CHAR) AS precio_unitario,CAST(subtotal AS CHAR) AS subtotal
    FROM comprobante_items WHERE comprobantes_id=? ORDER BY renglon`, [comprobanteId]);
  return { ...comprobante, items };
};
const ejecutar = async (res, operacion, lectura = false) => {
  let c, abierta = false;
  try {
    c = mysql.createConnection(db.dbConfig).promise();
    if (lectura) {
      await c.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');
      await c.query('START TRANSACTION WITH CONSISTENT SNAPSHOT, READ ONLY');
    } else await c.beginTransaction();
    abierta = true;
    const r = await operacion(c);
    await c.commit(); abierta = false;
    return res.status(r.status || 200).json(r.body);
  } catch (e) {
    if (abierta) { try { await c.rollback(); } catch (r) { console.error('Rollback comprobantes:', r.message); } }
    if (e.code === 'ER_DUP_ENTRY') return res.status(409).json({error:'Ya existe el comprobante o una referencia duplicada.'});
    if (!e.status) console.error('Error comprobantes:', e.message);
    return res.status(e.status || 500).json({ error:e.status ? e.message : 'No se pudo completar la operación de comprobantes.',
      ...(e.comprobante ? {comprobante:e.comprobante} : {}) });
  } finally {
    if (c) { try { await c.end(); } catch (e) { console.error('Cierre comprobantes:', e.message); } }
  }
};
const emitir = async (c, body) => {
  if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some(k=>!['pedido_id','usuarios_id'].includes(k))) throw error(400,'Envía únicamente pedido_id y usuarios_id.');
  const pedidoId = id(body.pedido_id), usuarioId = id(body.usuarios_id);
  const pedido = await bloquearPedido(c,pedidoId);
  const [[usuario]] = await c.query('SELECT id FROM usuarios WHERE id=? LOCK IN SHARE MODE',[usuarioId]);
  if (!usuario) throw error(404,'Usuario emisor inexistente.');
  const [[existente]] = await c.query('SELECT id,CAST(numero AS CHAR) AS numero FROM comprobantes WHERE pedidos_id=? FOR UPDATE',[pedidoId]);
  if (existente) throw Object.assign(error(409,'El pedido ya tiene comprobante.'),{comprobante:existente});
  if (pedido.estado !== 'cerrado') throw error(409,'El pedido debe estar cerrado.');
  const cuenta = await calcularCuenta(c,pedido);
  if (cuenta.saldo !== 0n || !cuenta.totalDefinitivo) throw error(409,'El pedido no está completamente liquidado o su total no es definitivo.');
  const [[cliente]] = await c.query(`SELECT cl.id,cl.nombre FROM pedidos p
    JOIN clientes cl ON cl.id=p.clientes_id WHERE p.id=? LOCK IN SHARE MODE`,[pedidoId]);
  if (!cliente) throw error(409,'El pedido no tiene un cliente válido.');
  // LEFT JOIN permite detectar referencias faltantes, sin omitir consumos silenciosamente.
  const [productos] = await c.query(`SELECT pi.id,pr.nombre AS descripcion,pi.cantidad_pedida AS cantidad,
    CAST(pi.precio_unitario AS CHAR) AS precio_unitario
    FROM pedido_items pi LEFT JOIN productos pr ON pr.id=pi.productos_id
    WHERE pi.pedidos_id=? AND pi.estado!='cancelado' ORDER BY pi.id LOCK IN SHARE MODE`,[pedidoId]);
  const [juegos] = await c.query(`SELECT sj.id,a.nombre AS descripcion,CAST(sj.costo_total AS CHAR) AS costo_total
    FROM sesiones_juego sj LEFT JOIN activos_juego a ON a.id=sj.activos_juego_id
    WHERE sj.estado!='cancelada' AND EXISTS (SELECT 1 FROM pedido_items pi
      WHERE pi.id=sj.pedido_items_id AND pi.pedidos_id=? AND pi.estado!='cancelado')
    ORDER BY sj.id LOCK IN SHARE MODE`,[pedidoId]);
  const lineas = productos.map(p=>{
    if (!Number.isInteger(p.cantidad) || p.cantidad <= 0 || !p.descripcion) throw error(409,'Detalle de producto inconsistente.');
    const precio = centavos(p.precio_unitario);
    return {tipo:'producto',referencia_id:p.id,descripcion:p.descripcion,cantidad:p.cantidad,precio,subtotal:precio*BigInt(p.cantidad)};
  }).concat(juegos.map(j=>{
    if (!j.descripcion || j.costo_total === null) throw error(409,'Detalle de juego inconsistente.');
    const costo = centavos(j.costo_total);
    return {tipo:'juego',referencia_id:j.id,descripcion:j.descripcion,cantidad:1,precio:costo,subtotal:costo};
  }));
  const suma = tipo => lineas.filter(l=>l.tipo===tipo).reduce((a,l)=>a+l.subtotal,0n);
  if (suma('producto')!==cuenta.productos || suma('juego')!==cuenta.juegos || suma('producto')+suma('juego')!==cuenta.total) throw error(409,'El detalle no coincide con la liquidación.');
  const comprobanteId = randomUUID();
  const [insert] = await c.query(`INSERT INTO comprobantes
    (id,pedidos_id,clientes_id,cliente_nombre,usuarios_id,emitido_en,total_productos,total_juegos,total_general,total_pagado)
    VALUES (?,?,?,?,?,UTC_TIMESTAMP(),?,?,?,?)`,[comprobanteId,pedidoId,cliente.id,cliente.nombre,usuarioId,
      dinero(cuenta.productos),dinero(cuenta.juegos),dinero(cuenta.total),dinero(cuenta.pagado)]);
  escrito(insert);
  for (const [indice,l] of lineas.entries()) {
    const [r] = await c.query(`INSERT INTO comprobante_items
      (id,comprobantes_id,renglon,tipo,referencia_id,descripcion,cantidad,precio_unitario,subtotal)
      VALUES (?,?,?,?,?,?,?,?,?)`,[randomUUID(),comprobanteId,indice+1,l.tipo,l.referencia_id,l.descripcion,l.cantidad,dinero(l.precio),dinero(l.subtotal)]);
    escrito(r);
  }
  return {status:201,body:{mensaje:'Comprobante emitido correctamente.',comprobante:await detalle(c,comprobanteId)}};
};
const entero = (valor, defecto, maximo) => {
  if (valor === undefined) return defecto;
  if (typeof valor !== 'string' || !/^[1-9]\d*$/.test(valor) || !Number.isSafeInteger(Number(valor)) || Number(valor)>maximo) throw error(400,'Paginación inválida.');
  return Number(valor);
};
const listar = async (c, query) => {
  const pagina=entero(query.pagina,1,Number.MAX_SAFE_INTEGER),limite=entero(query.limite,20,100);
  const offset=(pagina-1)*limite;
  if (!Number.isSafeInteger(offset)) throw error(400,'Paginación fuera de rango.');
  const filtros=[],valores=[];
  for (const [param,columna] of [['pedido_id','pedidos_id'],['cliente_id','clientes_id']]) {
    if (query[param]!==undefined) { filtros.push(`${columna}=?`); valores.push(id(query[param])); }
  }
  const where=filtros.length?` WHERE ${filtros.join(' AND ')}`:'';
  const [[conteo]]=await c.query(`SELECT COUNT(*) AS total FROM comprobantes${where}`,valores);
  const [datos]=await c.query(`${cabecera}${where} ORDER BY emitido_en DESC,id DESC LIMIT ? OFFSET ?`,[...valores,limite,offset]);
  return {body:{mensaje:'Comprobantes consultados correctamente.',pagina,limite,total:conteo.total,datos}};
};
module.exports={ejecutar,emitir,listar,detalle,id};
