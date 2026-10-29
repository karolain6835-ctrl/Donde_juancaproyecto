import {apiClient} from './apiClient.js';
import {invalidResponse} from './catalogoContract.js';
import {operationId,operationPath,operationFail} from './operacionContract.js';
import {centavosDivision} from './divisionesService.js';
export const estadosJuego=Object.freeze({disponible:'Disponible',ocupado:'Ocupado',mantenimiento:'En mantenimiento'});
export const estadosSesionJuego=Object.freeze({activa:'Activa',cerrada:'Finalizada',cancelada:'Cancelada'});
export const tiposJuego=Object.freeze({billar:'Billar',tejo:'Tejo',juego:'Juego'});
function sesion(s){
 if(typeof s?.id!=='string'||!Object.hasOwn(estadosSesionJuego,s.estado)||typeof s.mesas_id!=='string'||typeof s.activos_juego_id!=='string')throw invalidResponse('sesiones de juego');
 if(s.costo_total!=null)centavosDivision(s.costo_total);
 if(s.tarifa_hora_aplicada!=null)centavosDivision(s.tarifa_hora_aplicada);
 return s;
}
export async function listarActivosJuego(options){
 const rows=(await apiClient('/juegos/activos',options))?.datos;
 if(!Array.isArray(rows))throw invalidResponse('juegos');
 return rows.map(a=>{if(typeof a?.id!=='string'||typeof a.nombre!=='string'||!Object.hasOwn(estadosJuego,a.estado)||!Object.hasOwn(tiposJuego,a.tipo))throw invalidResponse('juegos');centavosDivision(a.precio_hora);if(a.sesiones_activas!=null){if(!Array.isArray(a.sesiones_activas))throw invalidResponse('juegos');a.sesiones_activas.forEach(sesion);}return a;});
}
export async function listarSesionesJuego(estado,options){
 if(estado!==undefined&&!Object.hasOwn(estadosSesionJuego,estado))operationFail('Estado de juego inválido.');
 const rows=(await apiClient(`/juegos/sesiones${estado?`?estado=${estado}`:''}`,options))?.datos;
 if(!Array.isArray(rows))throw invalidResponse('sesiones de juego');return rows.map(sesion);
}
export function inicioJuegoBody(activo,mesaId,pedido,mesas){
 if(!activo||activo.estado!=='disponible'||activo.sesiones_activas?.length)operationFail('El juego no está disponible. Actualiza la lista.');
 if(!mesas.some(m=>m.id===mesaId))operationFail('Selecciona una mesa real.');
 if(pedido&&(pedido.estado!=='abierto'||pedido.mesas_id!==mesaId))operationFail('Selecciona un pedido abierto de esta mesa.');
 return {activos_juego_id:operationId(activo.id),mesas_id:operationId(mesaId),...(pedido?{pedidos_id:operationId(pedido.id)}:{})};
}
export async function iniciarJuego(body){
 const result=await apiClient('/juegos/iniciar',{method:'POST',body});
 if(typeof result?.id_sesion!=='string'||result.datos?.pedidos_id!==(body.pedidos_id??null)||result.datos?.pedido_items_id!==null)throw invalidResponse('inicio de juego');
 sesion(result.datos);return result;
}
export async function finalizarJuego(id){
 const result=await apiClient(`/juegos/${operationPath(id)}/terminar`,{method:'PUT',body:{}});
 if(result?.id_sesion!==id||result.datos?.estado!=='cerrada')throw invalidResponse('finalización de juego');
 centavosDivision(result.total_cobrado);sesion(result.datos);return result;
}
export async function cambiarEstadoJuego(id,estado){
 if(!['disponible','mantenimiento'].includes(estado))operationFail('Selecciona un estado válido.');
 const result=await apiClient(`/juegos/activos/${operationPath(id)}/estado`,{method:'PATCH',body:{estado}});
 if(result?.datos?.id!==id||result.datos.estado!==estado)throw invalidResponse('estado del juego');
 return result;
}
export async function editarTarifaJuego(id,precio){
 const result=await apiClient(`/juegos/activos/${operationPath(id)}/tarifa`,{method:'PATCH',body:{precio_hora:precio}});
 if(result?.datos?.id!==id)throw invalidResponse('tarifa del juego');
 centavosDivision(result.datos.precio_hora);return result;
}
export async function asociarPedidoJuego(id,pedidoId){
 const result=await apiClient(`/juegos/sesiones/${operationPath(id)}/pedido`,{method:'PATCH',body:{pedidos_id:operationId(pedidoId)}});
 if(result?.datos?.id!==id||result.datos.pedidos_id!==pedidoId)throw invalidResponse('pedido del juego');
 sesion(result.datos);return result;
}
export async function liquidacionJuego(id,options){
 const data=(await apiClient(`/juegos/sesiones/${operationPath(id)}/liquidacion`,options))?.datos;
 if(data?.sesion?.id!==id||!Array.isArray(data.pagos)||typeof data.total_definitivo!=='boolean')throw invalidResponse('cuenta del juego');
 for(const key of ['total_cuenta','total_pagado','saldo_pendiente','pagos_pendientes_verificacion','disponible'])centavosDivision(data[key]);
 return data;
}
export function juegoSinPedidoPendiente(s){
 if(s.pedidos_id||s.pedido_items_id||s.pedido_id||s.estado==='cancelada')return false;
 return s.estado==='activa'||s.costo_total==null||centavosDivision(s.costo_total)>centavosDivision(s.pagado_directo??0)||centavosDivision(s.pendiente_directo??0)>0n;
}
export function duracionJuego(s){
 if(!s.fecha_inicio||!s.fecha_fin)return '—';
 const inicio=Date.parse(s.fecha_inicio),fin=Date.parse(s.fecha_fin);
 if(!Number.isFinite(inicio)||!Number.isFinite(fin)||fin<inicio)return '—';
 const segundos=Math.floor((fin-inicio)/1000);
 return `${Math.floor(segundos/3600)} h ${Math.floor(segundos%3600/60)} min ${segundos%60} s`;
}
