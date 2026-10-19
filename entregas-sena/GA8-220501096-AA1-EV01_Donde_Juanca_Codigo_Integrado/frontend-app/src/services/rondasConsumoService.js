import { apiClient } from './apiClient.js';
import { operationId, operationPath, operationFail } from './operacionContract.js';
import { invalidResponse } from './catalogoContract.js';
const path = id => `/pedidos/${operationPath(id)}/rondas`;
function adapt(row) {
  if (!row || typeof row.id !== 'string' || !Number.isInteger(row.numero_ronda) || !Array.isArray(row.items) || !['confirmada','cancelada'].includes(row.estado)) throw invalidResponse('rondas');
  return row;
}
export async function listarRondas(id,options) {
  const response=await apiClient(path(id),options);
  if(!Array.isArray(response?.datos))throw invalidResponse('rondas');
  return response.datos.map(adapt);
}
export async function obtenerRonda(pedidoId,id,options) { return adapt((await apiClient(`${path(pedidoId)}/${operationPath(id)}`,options))?.datos); }
export function copiarRonda(ronda) {
  return ronda.items.filter(i=>i.estado!=='cancelado').map(i=>({ participante_id:i.participante_id || '',productos_id:i.productos_id,cantidad:String(i.cantidad_pedida) }));
}
export function baseRonda(rondas,items=[]) {
  const ultima=rondas.filter(r=>r.estado==='confirmada').reduce((last,r)=>!last || r.numero_ronda>last.numero_ronda?r:last,null);
  return copiarRonda(ultima || {items:items.filter(i=>i.ronda_consumo_id == null)});
}
export function rondaBody(lines,catalogo) {
  if(!lines.length || lines.length>100)operationFail('Agrega entre 1 y 100 productos.');
  const demanda=new Map();
  const items=lines.map(line=>{
    const producto=catalogo.productos.find(p=>p.id===line.productos_id && p.activo);
    if(!producto)operationFail('Selecciona un producto activo real.');
    if(!catalogo.participantes.some(p=>p.id===line.participante_id))operationFail('Selecciona un cliente.');
    const cantidad=Number(line.cantidad);
    if(!['string','number'].includes(typeof line.cantidad) || !Number.isInteger(cantidad) || cantidad<1 || cantidad>2147483647)operationFail('La cantidad debe ser un entero positivo.');
    const total=(demanda.get(producto.id)||0)+cantidad;demanda.set(producto.id,total);
    if(total>producto.stock)operationFail(`Stock insuficiente para ${producto.nombre}. Disponible: ${producto.stock}.`);
    return { participante_id:operationId(line.participante_id),productos_id:producto.id,cantidad };
  });
  return { items };
}
export async function confirmarRonda(pedidoId,body,key) {
  return adapt((await apiClient(path(pedidoId),{ method:'POST',body,headers:{ 'Idempotency-Key':key } }))?.datos);
}
