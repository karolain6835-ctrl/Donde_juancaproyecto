import {apiClient} from './apiClient.js';
import {operationPath} from './operacionContract.js';
import {invalidResponse} from './catalogoContract.js';
export async function comprobantePedido(pedidoId,options){
 const data=await apiClient(`/ventas/comprobantes/pedido/${operationPath(pedidoId)}`,options);
 if(typeof data?.puede_generar!=='boolean'||!Object.hasOwn(data,'comprobante')||data.comprobante&&(!Array.isArray(data.comprobante.items)||data.comprobante.pedidos_id!==pedidoId))throw invalidResponse('comprobante');
 return data;
}
export async function generarComprobante(pedidoId){
 try{await apiClient('/ventas/facturar',{method:'POST',body:{pedido_id:pedidoId}});}
 catch(e){
  // Un duplicado o una respuesta perdida se resuelven leyendo el documento persistido.
  if(e.status===409||e.code==='NETWORK_ERROR'){
   const actual=await comprobantePedido(pedidoId);
   if(actual.comprobante)return actual;
  }
  throw e;
 }
 return comprobantePedido(pedidoId);
}
