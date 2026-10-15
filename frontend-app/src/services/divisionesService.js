import {apiClient} from './apiClient.js';
import {operationPath,operationId,operationFail} from './operacionContract.js';
import {invalidResponse} from './catalogoContract.js';
import {parseCOPInput} from '../utils/copInput.js';
export const modalidadesDivision=Object.freeze({items:'Por productos',equitativa:'Partes iguales',total:'Una persona paga todo',personalizada:'Montos personalizados'});
export const estadosDivision=Object.freeze({activa:'Activa',completada:'Completada',cancelada:'Cancelada'});
const path=id=>`/sesiones-division/${operationPath(id)}`;
export function centavosDivision(value){
 const text=String(value);
 if(!/^\d+(\.\d{1,2})?$/.test(text))operationFail('El importe recibido no es válido.');
 const [entero,decimal='']=text.split('.');return BigInt(entero)*100n+BigInt(decimal.padEnd(2,'0'));
}
export const decimalDivision=n=>`${n/100n}.${String(n%100n).padStart(2,'0')}`;
export function montoCOP(value){
 try{parseCOPInput(value);}catch{operationFail('Monto inválido. Usa puntos para miles y coma para decimales, por ejemplo 3.500 o 2.844,44.');} // Misma regla COP, sin sumar floats.
 const [entero,decimal='']=value.trim().replaceAll('.','').split(',');
 return BigInt(entero)*100n+BigInt(decimal.padEnd(2,'0'));
}
export function disponiblePagador(p){
 const saldo=centavosDivision(p.saldo),pendiente=centavosDivision(p.pendiente_verificacion);
 return decimalDivision(saldo>pendiente?saldo-pendiente:0n);
}
function adapt(row){
 if(!row?.sesion||typeof row.sesion.id!=='string'||!Object.hasOwn(estadosDivision,row.estado)||!Array.isArray(row.participantes)||typeof row.desactualizada!=='boolean')throw invalidResponse('división de cuenta');
 for(const key of ['total_objetivo','total_asignado','total_pagado','total_pendiente','pendiente_verificacion'])centavosDivision(row[key]);
 for(const p of row.participantes){if(typeof p.id!=='string'||typeof p.nombre_cliente!=='string')throw invalidResponse('clientes de la cuenta');for(const key of ['asignado','pagado','pendiente_verificacion','saldo'])centavosDivision(p[key]);}
 return row;
}
export async function contextoDivision(id,options){
 const data=(await apiClient(`/pedidos/${operationPath(id)}/division-contexto`,options))?.datos;
 if(data?.pedido?.id!==id||!Array.isArray(data.items)||!Array.isArray(data.divisiones)||typeof data.total_definitivo!=='boolean')throw invalidResponse('cuenta para dividir');
 centavosDivision(data.saldo);centavosDivision(data.pendiente_verificacion);
 for(const i of data.items){if(typeof i.id!=='string'||!Number.isInteger(i.cantidad_disponible)||i.cantidad_disponible<0)throw invalidResponse('productos de la cuenta');centavosDivision(i.precio_unitario);}
 return data;
}
export async function crearDivision(mesas_id,modalidad){
 if(!Object.hasOwn(modalidadesDivision,modalidad))operationFail('Selecciona cómo dividir la cuenta.');
 const row=(await apiClient('/sesiones-division',{method:'POST',body:{mesas_id:operationId(mesas_id),modalidad}}))?.data;
 if(typeof row?.id!=='string')throw invalidResponse('creación de división');return row;
}
export async function asignarProductosDivision(id,body,key){
 const row=(await apiClient(`${path(id)}/asignar-items`,{method:'POST',body,headers:{'Idempotency-Key':key}}))?.data;
 if(typeof row?.participante_id!=='string'||row.sesion_division_id!==id)throw invalidResponse('asignación de productos');return row;
}
export async function definirCuotasDivision(id,body,key){return adapt((await apiClient(`${path(id)}/cuotas`,{method:'POST',body,headers:{'Idempotency-Key':key}}))?.data);}
export async function obtenerDivision(id,options){return adapt((await apiClient(path(id),options))?.data);}
export async function finalizarDivision(id,accion){
 if(!['cancelar','completar'].includes(accion))operationFail('Acción no válida.');
 return adapt((await apiClient(`${path(id)}/${accion}`,{method:'PATCH'}))?.data);
}
export function estimarIguales(total,ids){
 if(!ids.length)return [];
 const orden=[...new Set(ids)].sort((a,b)=>a.localeCompare(b)),saldo=centavosDivision(total),n=BigInt(orden.length);
 return orden.map((id,i)=>({jugadores_id:id,monto:decimalDivision(saldo/n+(BigInt(i)<saldo%n?1n:0n))}));
}
export function planDivision(modalidad,form,contexto,clientes){
 const real=id=>{if(!clientes.some(p=>p.id===id))operationFail('Selecciona un cliente de la mesa.');return operationId(id);};
 if(modalidad==='items'){
  const porCliente=new Map();let unidades=0;
  for(const item of contexto.items){
   let cantidad=0;
   for(const [persona,text]of Object.entries(form.productos?.[item.id]||{})){
    if(text==='')continue;
    if(!/^\d+$/.test(String(text)))operationFail('Usa cantidades enteras de productos.');
    const n=Number(text);if(!Number.isSafeInteger(n))operationFail('Cantidad fuera del rango permitido.');
    if(n===0)continue;const id=real(persona);cantidad+=n;unidades+=n;
    if(!porCliente.has(id))porCliente.set(id,[]);porCliente.get(id).push({pedido_item_id:item.id,cantidad:n});
   }
   if(cantidad>item.cantidad_disponible)operationFail(`La cantidad de ${item.nombre} supera las unidades disponibles.`);
  }
  if(!unidades)operationFail('Asigna al menos un producto.');
  return [...porCliente].map(([jugadores_id,items])=>({jugadores_id,items}));
 }
 if(centavosDivision(contexto.pendiente_verificacion)>0n||!contexto.total_definitivo)operationFail('La cuenta debe tener un total definitivo y no tener pagos pendientes de verificación.');
 const pedido_id=operationId(contexto.pedido.id);
 if(modalidad==='total')return [{pedido_id,jugadores_id:real(form.cliente)}];
 if(modalidad==='equitativa'){
  const ids=(form.clientes||[]).map(real);if(!ids.length)operationFail('Selecciona al menos un cliente.');
  return [{pedido_id,jugadores_ids:ids}];
 }
 if(modalidad!=='personalizada')operationFail('Selecciona cómo dividir la cuenta.');
 const rows=(form.cuotas||[]).map(p=>({jugadores_id:real(p.cliente),monto:decimalDivision(montoCOP(p.monto))}));
 if(!rows.length||new Set(rows.map(p=>p.jugadores_id)).size!==rows.length)operationFail('Selecciona clientes distintos.');
 if(rows.some(p=>centavosDivision(p.monto)<=0n))operationFail('Cada monto debe ser mayor que cero.');
 if(rows.reduce((n,p)=>n+centavosDivision(p.monto),0n)!==centavosDivision(contexto.saldo))operationFail('Los montos deben sumar exactamente el total a repartir.');
 return [{pedido_id,cuotas:rows}];
}
// Cada paso confirmado conserva su cursor: no reenviar a otro pagador al reintentar.
export async function ejecutarDivision(attempt,save){
 if(attempt.creacionIncierta)operationFail('Actualiza las divisiones y revisa si se creó antes de continuar.');
 if(!attempt.id){
  try{const row=await crearDivision(attempt.mesa,attempt.modalidad);attempt.id=row.id;save(attempt);}
  catch(e){if(!e.status||e.status>=500){attempt.creacionIncierta=true;save(attempt);}throw e;}
 }
 for(;attempt.cursor<attempt.steps.length;attempt.cursor++){
  const step=attempt.steps[attempt.cursor];
  if(attempt.modalidad==='items')await asignarProductosDivision(attempt.id,step.body,step.key);
  else await definirCuotasDivision(attempt.id,step.body,step.key);
  save({...attempt,cursor:attempt.cursor+1});
 }
 return obtenerDivision(attempt.id);
}
