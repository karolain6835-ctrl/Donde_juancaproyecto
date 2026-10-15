const {randomUUID,createHash}=require('node:crypto');
const {centavos,calcularCuenta}=require('./liquidacionService');
const {registrarAuditoria}=require('./auditoriaService');
const fallo=(status,message)=>Object.assign(new Error(message),{status});
const dinero=n=>`${n/100n}.${String(n%100n).padStart(2,'0')}`;
const valido=p=>p.estado==='pagado'&&p.verificacion_estado==='verificado';
const pendiente=p=>p.estado==='pendiente'&&p.verificacion_estado==='pendiente';
async function bloquear(c,id){
 const [[l]]=await c.query('SELECT mesas_id FROM sesiones_division_cuentas WHERE id=?',[id]);
 if(!l)throw fallo(404,'La división no existe.');
 await c.query('SELECT id FROM mesas WHERE id=? FOR UPDATE',[l.mesas_id]);
 const [[d]]=await c.query('SELECT * FROM sesiones_division_cuentas WHERE id=? FOR UPDATE',[id]);
 if(!d||d.mesas_id!==l.mesas_id)throw fallo(409,'La división cambió de mesa. Reintenta.');
 return d;
}
async function resumen(c,d){
 const [personas]=await c.query('SELECT * FROM division_participantes WHERE sesion_division_id=? ORDER BY id FOR UPDATE',[d.id]);
 const [pagos]=await c.query('SELECT * FROM pagos WHERE sesion_division_id=? FOR UPDATE',[d.id]);
 let asignado=0n,pagado=0n,reservado=0n;
 const participantes=[];
 for(const p of personas){
  const propios=pagos.filter(x=>x.participante_id===p.id);
  const a=centavos(p.total_asignado||0),v=propios.filter(valido).reduce((n,x)=>n+centavos(x.total_seleccionado),0n),r=propios.filter(pendiente).reduce((n,x)=>n+centavos(x.total_seleccionado),0n);
  const [items]=await c.query('SELECT id AS detalle_id,pedido_item_id,cantidad_asignada AS cantidad,subtotal FROM division_items_detalle WHERE participante_id=? ORDER BY id FOR UPDATE',[p.id]);
  participantes.push({id:p.id,jugadores_id:p.jugadores_id,nombre_cliente:p.nombre_cliente,creado_en:p.creado_en,total_asignado:Number(p.total_asignado),nombre:p.nombre_cliente,asignado:dinero(a),pagado:dinero(v),pendiente_verificacion:dinero(r),saldo:dinero(a>=v?a-v:0n),estado:v===a?'pagado':'pendiente',items:items.map(i=>({...i,subtotal:Number(i.subtotal)}))});
  asignado+=a;pagado+=v;reservado+=r;
 }
 const pagosValidos=pagos.filter(valido).reduce((n,p)=>n+centavos(p.total_seleccionado),0n),pagosPendientes=pagos.filter(pendiente).reduce((n,p)=>n+centavos(p.total_seleccionado),0n);
 let desactualizada=false,saldoActual=null,totalDefinitivo=true;
 if(d.pedido_id){
  const [[p]]=await c.query('SELECT id,mesas_id,estado FROM pedidos WHERE id=? FOR UPDATE',[d.pedido_id]);
  if(!p)throw fallo(409,'El pedido de la división no existe.');
  const cuenta=await calcularCuenta(c,p);saldoActual=dinero(cuenta.saldo);totalDefinitivo=cuenta.totalDefinitivo;
  desactualizada=centavos(d.total_cuenta_base)!==cuenta.total || cuenta.saldo!==centavos(d.total_objetivo)-pagado || cuenta.pendienteVerificacion!==reservado;
 }else if(d.modalidad==='items'&&d.cuentas_items_json){
  for(const [id,base]of Object.entries(JSON.parse(d.cuentas_items_json))){
   const cuenta=await calcularCuenta(c,{id});
   if(cuenta.total!==centavos(base))desactualizada=true;
   totalDefinitivo=totalDefinitivo&&cuenta.totalDefinitivo;
  }
 }
 const [[mesa]]=await c.query('SELECT numero FROM mesas WHERE id=?',[d.mesas_id]);
 return {sesion:{id:d.id,modalidad:d.modalidad,mesas_id:d.mesas_id,numero_mesa:mesa?.numero,usuarios_id:d.usuarios_id,creado_en:d.creado_en,sesion_mesa_id:d.sesion_mesa_id,pedido_id:d.pedido_id,estado:d.estado,completada_en:d.completada_en,cancelada_en:d.cancelada_en},estado:d.estado,modalidad:d.modalidad,total_objetivo:d.total_objetivo??dinero(asignado),total_asignado:dinero(asignado),total_acumulado:Number(dinero(asignado)),total_pagado:dinero(pagado),total_pendiente:dinero(asignado>=pagado?asignado-pagado:0n),pendiente_verificacion:dinero(reservado),saldo_actual:saldoActual,desactualizada,total_definitivo:totalDefinitivo,pagos_sin_cuota:pagosValidos!==pagado||pagosPendientes!==reservado,participantes};
}
function validar(body,key,modalidad){
 if(typeof key!=='string'||!/^[A-Za-z0-9._:-]{8,128}$/.test(key))throw fallo(400,'Envía Idempotency-Key válido.');
 if(!body||typeof body.pedido_id!=='string'||!body.pedido_id.trim()||body.pedido_id.length>36)throw fallo(400,'Indica el pedido que se divide.');
 const field=modalidad==='total'?'jugadores_id':modalidad==='equitativa'?'jugadores_ids':'cuotas';
 if(Object.keys(body).some(k=>!['pedido_id',field].includes(k)))throw fallo(400,'Campos no permitidos para esta modalidad.');
 if(modalidad==='equitativa'&&!Array.isArray(body.jugadores_ids))throw fallo(400,'Indica una lista de clientes.');
 let cuotas=modalidad==='total'?[{jugadores_id:body.jugadores_id}]:modalidad==='equitativa'?body.jugadores_ids.map(jugadores_id=>({jugadores_id})):body.cuotas;
 if(!Array.isArray(cuotas)||!cuotas.length||cuotas.length>100)throw fallo(400,'Indica entre 1 y 100 clientes.');
 cuotas=cuotas.map(p=>{
  if(!p||Object.keys(p).some(k=>!['jugadores_id','monto'].includes(k))||typeof p.jugadores_id!=='string'||!p.jugadores_id.trim()||p.jugadores_id.length>36)throw fallo(400,'Cliente inválido.');
  if(modalidad==='personalizada'){
   if(!['string','number'].includes(typeof p.monto)||!/^\d{1,8}(\.\d{1,2})?$/.test(String(p.monto))||centavos(p.monto)<=0n)throw fallo(400,'Los montos deben ser positivos con hasta dos decimales.');
   return {jugadores_id:p.jugadores_id,monto:dinero(centavos(p.monto))};
  }
  return {jugadores_id:p.jugadores_id};
 }).sort((a,b)=>a.jugadores_id.localeCompare(b.jugadores_id));
 if(new Set(cuotas.map(p=>p.jugadores_id)).size!==cuotas.length)throw fallo(400,'No repitas clientes.');
 return {pedido_id:body.pedido_id,cuotas};
}
async function configurar(c,d,body,key,actor){
 if(!['equitativa','total','personalizada'].includes(d.modalidad))throw fallo(409,'Usa asignar-items para esta división.');
 const normalized=validar(body,key,d.modalidad),hash=createHash('sha256').update(JSON.stringify(normalized)).digest('hex');
 if(d.cuotas_clave){
  if(d.cuotas_clave!==key||d.cuotas_hash!==hash)throw fallo(409,'Las cuotas ya están definidas. No se modifican ni duplican.');
  return {status:200,data:await resumen(c,d)};
 }
 if(d.estado!=='activa'||!d.sesion_mesa_id)throw fallo(409,'La división debe estar activa y vinculada a una visita.');
 const [[visita]]=await c.query('SELECT estado,mesas_id FROM sesiones_mesa WHERE id=? FOR UPDATE',[d.sesion_mesa_id]);
 if(!visita||visita.estado!=='activa'||visita.mesas_id!==d.mesas_id)throw fallo(409,'La visita no está activa en esta mesa.');
 const [[pedido]]=await c.query('SELECT * FROM pedidos WHERE id=? FOR UPDATE',[normalized.pedido_id]);
 if(!pedido||pedido.estado!=='abierto'||pedido.sesion_mesa_id!==d.sesion_mesa_id||pedido.mesas_id!==d.mesas_id)throw fallo(409,'El pedido debe estar abierto en esta visita.');
 const [otras]=await c.query(`SELECT DISTINCT sd.id FROM sesiones_division_cuentas sd
  LEFT JOIN division_participantes dp ON dp.sesion_division_id=sd.id
  LEFT JOIN division_items_detalle di ON di.participante_id=dp.id
  LEFT JOIN pedido_items pi ON pi.id=di.pedido_item_id
  WHERE sd.estado='activa' AND sd.id<>? AND (sd.pedido_id=? OR pi.pedidos_id=?) FOR UPDATE`,[d.id,pedido.id,pedido.id]);
 if(otras.length)throw fallo(409,'El pedido ya tiene otra división activa con cuotas o asignaciones.');
 const cuenta=await calcularCuenta(c,pedido);
 if(!cuenta.totalDefinitivo||cuenta.pendienteVerificacion>0n||cuenta.saldo<=0n)throw fallo(409,'Se requiere saldo positivo definitivo y sin pagos pendientes.');
 const [anteriores]=await c.query('SELECT id FROM division_participantes WHERE sesion_division_id=? FOR UPDATE',[d.id]);
 if(anteriores.length)throw fallo(409,'La división ya tiene asignaciones.');
 const objetivo=cuenta.saldo,N=BigInt(normalized.cuotas.length);
 let suma=0n;
 for(const [i,p] of normalized.cuotas.entries()){
  const [[persona]]=await c.query('SELECT nombre FROM jugadores WHERE id=? AND sesion_mesa_id=? FOR UPDATE',[p.jugadores_id,d.sesion_mesa_id]);
  if(!persona)throw fallo(409,'El cliente no pertenece a esta visita.');
  const monto=d.modalidad==='personalizada'?centavos(p.monto):objetivo/N+(BigInt(i)<objetivo%N?1n:0n);
  if(monto<=0n||monto>9999999999n)throw fallo(409,'La cuota está fuera del rango permitido.');
  suma+=monto;
  await c.query('INSERT INTO division_participantes(id,sesion_division_id,jugadores_id,nombre_cliente,total_asignado) VALUES (?,?,?,?,?)',[randomUUID(),d.id,p.jugadores_id,persona.nombre,dinero(monto)]);
 }
 if(suma!==objetivo)throw fallo(409,'La suma de cuotas debe coincidir exactamente con el saldo objetivo.');
 await c.query('UPDATE sesiones_division_cuentas SET pedido_id=?,total_objetivo=?,total_cuenta_base=?,cuotas_clave=?,cuotas_hash=? WHERE id=?',[pedido.id,dinero(objetivo),dinero(cuenta.total),key,hash,d.id]);
 Object.assign(d,{pedido_id:pedido.id,total_objetivo:dinero(objetivo),total_cuenta_base:dinero(cuenta.total),cuotas_clave:key,cuotas_hash:hash});
 await registrarAuditoria(c,actor,'divisiones','division_cuotas_definidas','sesiones_division_cuentas',d.id,{modalidad:d.modalidad,pedido_id:pedido.id,total_objetivo:dinero(objetivo),cuotas:normalized.cuotas});
 return {status:201,data:await resumen(c,d)};
}
async function cambiarEstado(c,d,estado,actor){
 if(d.estado===estado)return {status:200,data:await resumen(c,d)};
 if(d.estado!=='activa')throw fallo(409,'La división ya terminó y no puede cambiar de estado.');
 const r=await resumen(c,d);
 const [pagos]=await c.query('SELECT estado,verificacion_estado FROM pagos WHERE sesion_division_id=? FOR UPDATE',[d.id]);
 if(estado==='cancelada'){
  if(pagos.some(p=>valido(p)||pendiente(p)))throw fallo(409,'No se puede cancelar con pagos verificados o pendientes. Rechaza primero los pendientes.');
 }else{
  if(d.modalidad==='items'){
   for(const id of Object.keys(JSON.parse(d.cuentas_items_json||'{}'))){
    if((await calcularCuenta(c,{id})).pendienteVerificacion>0n)throw fallo(409,'Hay un pago pendiente de verificación en el pedido.');
   }
   const [items]=await c.query(`SELECT pi.estado,pi.precio_unitario,pi.cantidad_pedida,di.cantidad_asignada,di.subtotal
    FROM division_items_detalle di JOIN division_participantes dp ON dp.id=di.participante_id
    LEFT JOIN pedido_items pi ON pi.id=di.pedido_item_id WHERE dp.sesion_division_id=? FOR UPDATE`,[d.id]);
   if(items.some(i=>!i.estado||i.estado==='cancelado'||i.cantidad_asignada>i.cantidad_pedida||centavos(i.subtotal)!==centavos(i.precio_unitario)*BigInt(i.cantidad_asignada)))throw fallo(409,'Las asignaciones requieren conciliación.');
  }
  if(!r.participantes.length||r.desactualizada||!r.total_definitivo||r.pagos_sin_cuota||r.participantes.some(p=>p.pagado!==p.asignado||centavos(p.pendiente_verificacion)>0n)||pagos.some(pendiente))throw fallo(409,'La división tiene saldo, pagos pendientes o cuotas desactualizadas.');
 }
 await c.query(`UPDATE sesiones_division_cuentas SET estado=?,${estado==='cancelada'?'cancelada_en':'completada_en'}=UTC_TIMESTAMP() WHERE id=?`,[estado,d.id]);
 await registrarAuditoria(c,actor,'divisiones',estado==='cancelada'?'division_cancelada':'division_completada','sesiones_division_cuentas',d.id,{antes:'activa',despues:estado});
 const [[actual]]=await c.query('SELECT * FROM sesiones_division_cuentas WHERE id=? FOR UPDATE',[d.id]);
 return {status:200,data:await resumen(c,actual)};
}
// Reutiliza las mismas reglas del cierre manual; los fallos de escritura abortan el pago.
async function completarAlVerificar(c,id,actor){
 if(!id)return null;
 const d=await bloquear(c,id);
 if(d.estado!=='activa')return {id:d.id,estado:d.estado,motivo:null};
 try{
  const result=await cambiarEstado(c,d,'completada',actor);
  return {id:d.id,estado:result.data.estado,motivo:null};
 }catch(e){
  if(e.status!==409)throw e;
  return {id:d.id,estado:d.estado,motivo:e.message};
 }
}
module.exports={bloquear,resumen,configurar,cambiarEstado,completarAlVerificar};
