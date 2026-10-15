const mysql = require('mysql2');
const db = require('../config/db');
const { randomUUID, createHash } = require('crypto');
const { ejecutor } = require('../services/identidadService');
const { agregarLineaPedido } = require('../services/pedidoItemsService');
const { bloquearAmbitoPedido, validarSesionPedido } = require('../services/sesionesMesaService');
const fallo = (status,message,codigo) => Object.assign(new Error(message),{ status,codigo });
const idValido = id => typeof id === 'string' && id.trim() === id && id.length > 0 && id.length <= 36;
function validar(body, key) {
  if (typeof key !== 'string' || !/^[A-Za-z0-9._:-]{8,128}$/.test(key)) throw fallo(400,'Envía Idempotency-Key válido (8 a 128 caracteres).');
  if (!body || Object.keys(body).some(k => !['items'].includes(k)) || !Array.isArray(body.items) || !body.items.length || body.items.length > 100) throw fallo(400,'Indica entre 1 y 100 líneas.');
  const items = body.items.map(i => {
    if (!i || Object.keys(i).some(k => !['participante_id','productos_id','cantidad'].includes(k)) || !idValido(i.participante_id) || !idValido(i.productos_id) || !Number.isInteger(i.cantidad) || i.cantidad < 1 || i.cantidad > 2147483647) throw fallo(400,'Cada línea requiere participante, producto y cantidad entera positiva.');
    return { participante_id:i.participante_id,productos_id:i.productos_id,cantidad:i.cantidad };
  });
  return { items };
}
async function detalle(c,pedidoId,id) {
  const [[row]] = await c.query('SELECT id,pedido_id,numero_ronda,estado,creada_en,creada_por FROM rondas_consumo WHERE id=? AND pedido_id=? FOR UPDATE',[id,pedidoId]);
  if (!row) throw fallo(404,'Ronda no encontrada en este pedido.');
  [row.items] = await c.query(`SELECT pi.id,pi.participante_id,j.nombre AS participante_nombre,pi.productos_id,p.nombre AS producto,
    pi.cantidad_pedida,pi.precio_unitario,pi.estado FROM pedido_items pi
    JOIN productos p ON p.id=pi.productos_id LEFT JOIN jugadores j ON j.id=pi.participante_id
    WHERE pi.ronda_consumo_id=? ORDER BY pi.id FOR UPDATE`,[id]);
  return row;
}
async function operar(req,res,confirmar) {
  let c,abierta=false;
  try {
    const actor = confirmar ? ejecutor(req,res) : null;
    if (confirmar && !actor) return;
    const key = req.get?.('Idempotency-Key');
    const body = confirmar ? validar(req.body,key) : null;
    const hash = body ? createHash('sha256').update(JSON.stringify(body)).digest('hex') : null;
    c=mysql.createConnection(db.dbConfig).promise(); await c.beginTransaction(); abierta=true;
    if (!idValido(req.params.pedido_id)) throw fallo(400,'Pedido inválido.');
    const pedido = await bloquearAmbitoPedido(c,req.params.pedido_id);
    let datos,status=200;
    if (confirmar) {
      const [[previa]] = await c.query('SELECT id,solicitud_hash FROM rondas_consumo WHERE pedido_id=? AND idempotencia_clave=? FOR UPDATE',[pedido.id,key]);
      if (previa) {
        if (previa.solicitud_hash !== hash) throw fallo(409,'Idempotency-Key ya se utilizó con otra solicitud.','IDEMPOTENCIA_DISTINTA');
        datos=await detalle(c,pedido.id,previa.id);
      } else {
        if (pedido.estado !== 'abierto') throw fallo(409,'El pedido debe estar abierto.');
        await validarSesionPedido(c,pedido);
        const productos = new Map();
        for (const id of [...new Set(body.items.map(i=>i.productos_id))].sort()) {
          const [[producto]] = await c.query('SELECT id,estado,precio_venta FROM productos WHERE id=? FOR UPDATE',[id]);
          if (!producto) throw fallo(404,'Producto no encontrado.');
          if (producto.estado !== 'activo' || Number(producto.precio_venta) <= 0) throw fallo(409,'El producto debe estar activo y tener precio de venta válido.');
          productos.set(id,producto);
        }
        const [[ultima]] = await c.query('SELECT COALESCE(MAX(numero_ronda),0) AS numero FROM rondas_consumo WHERE pedido_id=? FOR UPDATE',[pedido.id]);
        const id=randomUUID();
        await c.query("INSERT INTO rondas_consumo(id,pedido_id,numero_ronda,estado,creada_en,creada_por,idempotencia_clave,solicitud_hash) VALUES (?,?,?,'confirmada',UTC_TIMESTAMP(),?,?,?)",[id,pedido.id,Number(ultima.numero)+1,actor,key,hash]);
        for (const item of body.items) await agregarLineaPedido(c,pedido,{ productos_id:item.productos_id,participante_id:item.participante_id,cantidad_pedida:item.cantidad,precio_unitario:productos.get(item.productos_id).precio_venta },actor,id);
        datos=await detalle(c,pedido.id,id); status=201;
      }
    } else if (req.params.ronda_id) datos=await detalle(c,pedido.id,req.params.ronda_id);
    else {
      const [rows]=await c.query('SELECT id FROM rondas_consumo WHERE pedido_id=? ORDER BY numero_ronda FOR UPDATE',[pedido.id]);
      datos=[]; for (const row of rows) datos.push(await detalle(c,pedido.id,row.id));
    }
    await c.commit();abierta=false;return res.status(status).json({ datos });
  } catch(error) {
    if(abierta){try{await c.rollback();}catch(e){console.error('Rollback ronda:',e.message);}}
    const conflicto=['ER_DUP_ENTRY','ER_LOCK_DEADLOCK','ER_LOCK_WAIT_TIMEOUT'].includes(error.code);
    return res.status(error.status || (conflicto?409:500)).json({ error:error.status?error.message:conflicto?'Conflicto concurrente al confirmar la ronda. Reintenta con la misma clave.':'No se pudo procesar la ronda.',codigo:error.codigo || (conflicto?'CONFLICTO_CONCURRENTE':'ERROR_RONDA') });
  } finally {if(c){try{await c.end();}catch(e){console.error('Cierre ronda:',e.message);}}}
}
exports.listar=(req,res)=>operar(req,res,false);
exports.obtener=(req,res)=>operar(req,res,false);
exports.confirmar=(req,res)=>operar(req,res,true);
exports.validar=validar;
