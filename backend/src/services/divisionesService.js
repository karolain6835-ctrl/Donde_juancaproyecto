const { randomUUID, createHash } = require('node:crypto');
const { centavos, calcularCuenta } = require('./liquidacionService');
const { registrarAuditoria } = require('./auditoriaService');
const fallo=(status,message)=>Object.assign(new Error(message),{status});
const dinero=n=>`${n/100n}.${String(n%100n).padStart(2,'0')}`;
const id=x=>typeof x==='string' && x.length>0 && x.length<=36 && x.trim()===x;
function validar(body,key){
 if(typeof key!=='string'||!/^[A-Za-z0-9._:-]{8,128}$/.test(key))throw fallo(400,'Envía Idempotency-Key de 8 a 128 caracteres.');
 if(!body||Object.keys(body).some(k=>!['jugadores_id','items'].includes(k))||!id(body.jugadores_id)||!Array.isArray(body.items)||!body.items.length||body.items.length>100)throw fallo(400,'Indica un cliente y entre 1 y 100 productos.');
 const items=body.items.map(i=>{
  if(!i||Object.keys(i).some(k=>!['pedido_item_id','cantidad'].includes(k))||!id(i.pedido_item_id)||!Number.isInteger(i.cantidad)||i.cantidad<=0||i.cantidad>2147483647)throw fallo(400,'Cada producto requiere ID y cantidad entera positiva; no envíes precios.');
  return {pedido_item_id:i.pedido_item_id,cantidad:i.cantidad};
 });
 return {jugadores_id:body.jugadores_id,items};
}
async function bloquear(c,divisionId){
 const [[ubicacion]]=await c.query('SELECT mesas_id FROM sesiones_division_cuentas WHERE id=?',[divisionId]);
 if(!ubicacion)throw fallo(404,'La división no existe.');
 await c.query('SELECT id FROM mesas WHERE id=? FOR UPDATE',[ubicacion.mesas_id]);
 const [[division]]=await c.query('SELECT * FROM sesiones_division_cuentas WHERE id=? FOR UPDATE',[divisionId]);
 if(!division||division.mesas_id!==ubicacion.mesas_id)throw fallo(409,'La división cambió de mesa. Reintenta.');
 return division;
}
async function asignar(c,divisionId,body,key,actor){
 const hash=createHash('sha256').update(JSON.stringify(body)).digest('hex');
 const division=await bloquear(c,divisionId);
 const [[previa]]=await c.query('SELECT id,solicitud_hash,nombre_cliente,total_asignado,jugadores_id FROM division_participantes WHERE sesion_division_id=? AND idempotencia_clave=? FOR UPDATE',[divisionId,key]);
 if(previa){
  if(previa.solicitud_hash!==hash)throw fallo(409,'La clave ya se utilizó con otra asignación.');
  const [[cantidad]]=await c.query('SELECT COUNT(*) AS n FROM division_items_detalle WHERE participante_id=? FOR UPDATE',[previa.id]);
  return {status:200,data:{participante_id:previa.id,sesion_division_id:divisionId,jugadores_id:previa.jugadores_id,nombre_cliente:previa.nombre_cliente,total_asignado:previa.total_asignado,items_asignados:cantidad.n}};
 }
 if(division.estado!=='activa')throw fallo(409,'La división ya no está activa.');
 if(!division.sesion_mesa_id)throw fallo(409,'La división histórica es de solo consulta para nuevas asignaciones.');
 if(division.modalidad!=='items')throw fallo(409,'Esta fase permite únicamente asignar productos.');
 const [[visita]]=await c.query('SELECT id,estado,mesas_id FROM sesiones_mesa WHERE id=? FOR UPDATE',[division.sesion_mesa_id]);
 if(!visita||visita.estado!=='activa'||visita.mesas_id!==division.mesas_id)throw fallo(409,'La visita de la división ya no está activa en esta mesa.');
 const [[pagador]]=await c.query('SELECT id,nombre FROM jugadores WHERE id=? AND sesion_mesa_id=? FOR UPDATE',[body.jugadores_id,visita.id]);
 if(!pagador)throw fallo(409,'El cliente que paga debe pertenecer a esta visita.');
 const demanda=new Map();
 for(const i of body.items)demanda.set(i.pedido_item_id,(demanda.get(i.pedido_item_id)||0)+i.cantidad);
 const participanteId=randomUUID(),procesados=[];let total=0n,pedidoId=null;
 for(const [itemId,cantidad]of [...demanda].sort(([a],[b])=>a.localeCompare(b))){
  const [[item]]=await c.query(`SELECT pi.*,p.sesion_mesa_id AS visita,p.mesas_id AS mesa,p.estado AS estado_pedido
   FROM pedido_items pi JOIN pedidos p ON p.id=pi.pedidos_id WHERE pi.id=? FOR UPDATE`,[itemId]);
  if(!item||item.pedido_id!==item.pedidos_id||item.visita!==visita.id||item.mesa!==division.mesas_id||item.estado==='cancelado'||item.estado_pedido!=='abierto')throw fallo(409,'El producto no está disponible en un pedido abierto de esta visita.');
  if(pedidoId&&pedidoId!==item.pedidos_id)throw fallo(409,'Asigna productos de un solo pedido por operación.');
  pedidoId=item.pedidos_id;
  const [monetarias]=await c.query("SELECT id FROM sesiones_division_cuentas WHERE pedido_id=? AND estado='activa' AND modalidad<>'items' FOR UPDATE",[pedidoId]);
  if(monetarias.length)throw fallo(409,'El pedido tiene una división monetaria activa.');
  const [previas]=await c.query(`SELECT di.cantidad_asignada FROM division_items_detalle di
   LEFT JOIN division_participantes dp ON dp.id=di.participante_id
   LEFT JOIN sesiones_division_cuentas sd ON sd.id=dp.sesion_division_id
   WHERE di.pedido_item_id=? AND (sd.estado IS NULL OR sd.estado<>'cancelada') FOR UPDATE`,[itemId]);
  if(previas.some(r=>!Number.isInteger(r.cantidad_asignada)||r.cantidad_asignada<=0))throw fallo(409,'Las asignaciones históricas del producto requieren conciliación.');
  if(previas.reduce((n,r)=>n+BigInt(r.cantidad_asignada),0n)+BigInt(cantidad)>BigInt(item.cantidad_pedida))throw fallo(409,'La cantidad supera las unidades disponibles para asignar.');
  const subtotal=centavos(item.precio_unitario)*BigInt(cantidad);total+=subtotal;
  if(total>9999999999n)throw fallo(409,'El total supera el rango monetario de la división.');
  procesados.push([randomUUID(),participanteId,itemId,cantidad,dinero(subtotal)]);
 }
 const bases=division.cuentas_items_json?JSON.parse(division.cuentas_items_json):{};
 const cuenta=await calcularCuenta(c,{id:pedidoId});
 if(bases[pedidoId]&&bases[pedidoId]!==dinero(cuenta.total)){
  const [pagos]=await c.query("SELECT id FROM pagos WHERE sesion_division_id=? AND (estado='pagado' OR estado='pendiente') FOR UPDATE",[divisionId]);
  if(pagos.length)throw fallo(409,'El consumo cambió y la división tiene pagos: requiere conciliación.');
 }
 bases[pedidoId]=dinero(cuenta.total);
 await c.query('UPDATE sesiones_division_cuentas SET cuentas_items_json=? WHERE id=?',[JSON.stringify(bases),divisionId]);
 await c.query('INSERT INTO division_participantes(id,sesion_division_id,jugadores_id,nombre_cliente,total_asignado,idempotencia_clave,solicitud_hash) VALUES (?,?,?,?,?,?,?)',[participanteId,divisionId,pagador.id,pagador.nombre,dinero(total),key,hash]);
 await c.query('INSERT INTO division_items_detalle(id,participante_id,pedido_item_id,cantidad_asignada,subtotal) VALUES ?',[procesados]);
 await registrarAuditoria(c,actor,'divisiones','division_items_asignados','sesiones_division_cuentas',divisionId,{iniciador_original:division.usuarios_id,participante_id:participanteId,jugadores_id:pagador.id,total_asignado:dinero(total),items:procesados.map(r=>({id:r[0],pedido_item_id:r[2],cantidad:r[3],subtotal:r[4]}))});
 return {status:201,data:{participante_id:participanteId,sesion_division_id:divisionId,jugadores_id:pagador.id,nombre_cliente:pagador.nombre,total_asignado:dinero(total),items_asignados:procesados.length}};
}
async function divisionesActivasPedido(c,pedidoId,{bloquear=true}={}){
  const [activas]=await c.query(`SELECT sd.id FROM sesiones_division_cuentas sd
   WHERE sd.estado='activa' AND (sd.pedido_id=? OR EXISTS (
    SELECT 1 FROM division_participantes dp JOIN division_items_detalle di ON di.participante_id=dp.id
    JOIN pedido_items pi ON pi.id=di.pedido_item_id
    WHERE dp.sesion_division_id=sd.id AND pi.pedidos_id=?))${bloquear?' FOR UPDATE':''}`,[pedidoId,pedidoId]);
  return activas;
}
async function validarPago(c,pedido,divisionId,participanteId){
 if(!divisionId){
  const activas=await divisionesActivasPedido(c,pedido.id);
  if(activas.length)throw fallo(409,'Este pedido tiene una división activa. Registra el pago por cliente desde la división.');
  return;
 }
 const [[division]]=await c.query('SELECT * FROM sesiones_division_cuentas WHERE id=? FOR UPDATE',[divisionId]);
 if(!division)throw fallo(404,'La división no existe.');
 if(division.estado!=='activa')throw fallo(409,'La división ya no acepta pagos.');
 if(!division.sesion_mesa_id)return; // Compatibilidad con pagos históricos.
 const [[p]]=await c.query('SELECT sesion_mesa_id FROM pedidos WHERE id=? FOR UPDATE',[pedido.id]);
 const [[visita]]=await c.query('SELECT estado,mesas_id FROM sesiones_mesa WHERE id=? FOR UPDATE',[division.sesion_mesa_id]);
 if(p?.sesion_mesa_id!==division.sesion_mesa_id||!visita||visita.estado!=='activa'||visita.mesas_id!==pedido.mesas_id)throw fallo(409,'Pedido y división deben pertenecer a la misma visita activa.');
 if(!participanteId)throw fallo(400,'Indica el cliente que paga la asignación.');
 const [[pagador]]=await c.query(`SELECT dp.jugadores_id,j.sesion_mesa_id FROM division_participantes dp
  LEFT JOIN jugadores j ON j.id=dp.jugadores_id WHERE dp.id=? AND dp.sesion_division_id=? FOR UPDATE`,[participanteId,divisionId]);
 if(!pagador||pagador.sesion_mesa_id!==division.sesion_mesa_id)throw fallo(409,'El pagador no pertenece a la división y visita indicadas.');
 const {resumen}=require('./divisionCuotasService');
 if((await resumen(c,division)).desactualizada)throw fallo(409,'El consumo o los pagos cambiaron; la división está desactualizada.');
 if(division.modalidad!=='items'){
  if(division.pedido_id!==pedido.id)throw fallo(409,'La cuota no pertenece a este pedido.');
  return;
 }
 const [items]=await c.query(`SELECT pi.pedidos_id,pi.pedido_id,pi.estado,d.cantidad_asignada,d.subtotal,pi.precio_unitario
  FROM division_items_detalle d LEFT JOIN pedido_items pi ON pi.id=d.pedido_item_id WHERE d.participante_id=? FOR UPDATE`,[participanteId]);
 if(!items.length||items.some(i=>i.pedidos_id!==pedido.id||i.pedido_id!==pedido.id||i.estado==='cancelado'||!Number.isInteger(i.cantidad_asignada)||i.cantidad_asignada<=0||centavos(i.subtotal)!==centavos(i.precio_unitario)*BigInt(i.cantidad_asignada)))throw fallo(409,'Las asignaciones no corresponden a los productos vigentes de este pedido.');
}
module.exports={validar,asignar,fallo,validarPago,divisionesActivasPedido};
