import {apiClient} from './apiClient.js';
import {operationId,operationPath,operationFail} from './operacionContract.js';
import {invalidResponse} from './catalogoContract.js';
import {centavosDivision,decimalDivision,montoCOP,disponiblePagador} from './divisionesService.js';
export const metodosPago=Object.freeze({efectivo:'Efectivo',nequi:'Nequi',daviplata:'Daviplata',tarjeta:'Tarjeta'});
export function estadoPago(p){
 if(p.verificacion_estado==='rechazado'||p.estado==='cancelado')return 'Rechazado';
 if(p.verificacion_estado==='verificado'&&p.estado==='pagado')return 'Verificado';
 if(p.verificacion_estado==='pendiente'&&p.estado==='pendiente')return 'Pendiente';
 return 'Por revisar';
}
export async function listarPagosDivision(id,options){
 const rows=(await apiClient(`/sesiones-division/${operationPath(id)}/pagos`,options))?.datos;
 if(!Array.isArray(rows))throw invalidResponse('pagos de la cuenta');
 for(const p of rows){
  if(typeof p.id!=='string'||p.sesion_division_id!==id||!Object.hasOwn(metodosPago,p.metodo_de_pago)||!['pendiente','verificado','rechazado'].includes(p.verificacion_estado))throw invalidResponse('pagos de la cuenta');
  centavosDivision(p.total_seleccionado);
 }
 return rows;
}
export function nuevoIdPago(){return `p-${crypto.randomUUID().replaceAll('-','').slice(0,18)}`;}
export function pagoDivisionBody(form,pagador,division,pedidoId,id){
 if(typeof id!=='string'||!id.length||id.length>20)operationFail('No se pudo identificar el intento de pago.');
 if(division.estado!=='activa'||division.desactualizada)operationFail('Esta división no permite nuevos pagos.');
 if(!Object.hasOwn(metodosPago,form.metodo))operationFail('Selecciona un método de pago válido.');
 const importe=montoCOP(form.valor);
 if(importe<=0n)operationFail('El valor debe ser mayor que cero.');
 if(importe>centavosDivision(disponiblePagador(pagador)))operationFail('El valor supera el saldo por pagar.');
 return {id,pedidos_id:operationId(pedidoId),sesion_division_id:operationId(division.sesion.id),participante_id:operationId(pagador.id),total_seleccionado:decimalDivision(importe),metodo_de_pago:form.metodo};
}
export async function registrarPagoDivision(body){
 if(typeof body?.id!=='string'||!body.id.length||body.id.length>20)operationFail('No se pudo identificar el intento de pago.');
 try{
  const row=await apiClient('/pagos',{method:'POST',body});
  if(row?.id_pago!==body.id)throw invalidResponse('pago');return row;
 }catch(error){
  // La PK de pagos protege de duplicados incluso ante dos requests concurrentes.
  // Recuperar únicamente el mismo pago y contenido; nunca generar otro ID aquí.
  let rows;try{rows=await listarPagosDivision(body.sesion_division_id);}catch{throw error;}
  const p=rows.find(p=>p.id===body.id);
  if(p&&p.pedidos_id===body.pedidos_id&&p.participante_id===body.participante_id&&p.metodo_de_pago===body.metodo_de_pago&&centavosDivision(p.total_seleccionado)===centavosDivision(body.total_seleccionado))return {id_pago:p.id,estado:p.estado,verificacion_estado:p.verificacion_estado,recuperado:true};
  throw error;
 }
}
export async function verificarPago(id,decision){
 if(!['verificado','rechazado'].includes(decision))operationFail('Selecciona verificar o rechazar.');
 const row=await apiClient(`/pagos/${operationPath(id)}/verificar`,{method:'PATCH',body:{verificacion_estado:decision}});
 if(row?.id_pago!==id||row.verificacion_estado!==decision)throw invalidResponse('confirmación de pago');return row;
}
