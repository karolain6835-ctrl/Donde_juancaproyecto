import {apiClient,ApiError} from './apiClient';
export const configuracionVacia={nombreNegocio:'',nit:'',telefono:'',email:'',direccion:'',horaApertura:'',horaCierre:'',impuesto:'',moneda:'COP'};
export async function consultarConfiguracion(options){
 const r=await apiClient('/configuracion',options);
 if(!r?.configuracion||Object.keys(configuracionVacia).some(k=>!Object.hasOwn(r.configuracion,k)))throw new ApiError('Respuesta de configuración inválida.');
 return Object.fromEntries(Object.keys(configuracionVacia).map(k=>[k,r.configuracion[k]===null?'':String(r.configuracion[k])]));
}
// La confirmación visual espera persistencia y reconsulta del servidor.
export async function guardarConfiguracion(values){
 await apiClient('/configuracion',{method:'PUT',body:values});
 return consultarConfiguracion();
}
