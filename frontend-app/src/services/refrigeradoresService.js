import {apiClient,ApiError} from './apiClient.js';
import {readList,invalidResponse} from './catalogoContract.js';
export const estadosRefrigerador={activa:'Activa',mantenimiento:'Mantenimiento',apagada:'Apagada'};
export function refrigeradorBody(form){
 if(typeof form.nombre!=='string'||!form.nombre.trim()||[...form.nombre.trim()].length>80||typeof form.ubicacion!=='string'||[...form.ubicacion.trim()].length>45||!Object.hasOwn(estadosRefrigerador,form.estado))throw new ApiError('Revisa el nombre, la ubicación y el estado.',{status:400});
 return {nombre:form.nombre.trim(),ubicacion:form.ubicacion.trim()||null,estado:form.estado};
}
export async function listarRefrigeradores(options){
 return readList(await apiClient('/refrigeradores',options),'refrigeradores').map(r=>{
  if(!r||typeof r.id!=='string'||!r.id||typeof r.nombre!=='string'||!Object.hasOwn(estadosRefrigerador,r.estado)||(r.ubicacion!==null&&typeof r.ubicacion!=='string'))throw invalidResponse('refrigeradores');
  return {id:r.id,nombre:r.nombre,ubicacion:r.ubicacion,estado:r.estado};
 });
}
export async function guardarRefrigerador(form,id){
 const response=await apiClient(id?'/refrigeradores/'+encodeURIComponent(id):'/refrigeradores',{method:id?'PUT':'POST',body:refrigeradorBody(form)});
 if(!response?.refrigerador?.id)throw invalidResponse('refrigerador');return response;
}
