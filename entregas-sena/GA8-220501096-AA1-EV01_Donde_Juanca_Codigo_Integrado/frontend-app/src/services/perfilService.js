import {apiClient,ApiError} from './apiClient.js';
const invalid=message=>new ApiError(message,{status:400});
export function perfilBody(form){
 if(typeof form.nombre!=='string'||!form.nombre.trim()||[...form.nombre.trim()].length>100||typeof form.correo!=='string'||form.correo.trim().length>150||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.correo.trim()))throw invalid('Indica nombre y correo válidos.');
 return {nombre:form.nombre.trim(),correo:form.correo.trim()};
}
export function passwordBody(form){
 const keys=['contrasena_actual','contrasena_nueva','confirmar_contrasena'];
 if(keys.some(k=>typeof form[k]!=='string'||!form[k].trim()||new TextEncoder().encode(form[k]).length>72))throw invalid('Completa las contraseñas (máximo 72 bytes cada una).');
 if(form.contrasena_nueva!==form.confirmar_contrasena)throw invalid('La confirmación no coincide con la nueva contraseña.');
 if(form.contrasena_actual===form.contrasena_nueva)throw invalid('La nueva contraseña debe ser diferente de la actual.');
 return Object.fromEntries(keys.map(k=>[k,form[k]]));
}
export async function consultarPerfil(options){
 const r=await apiClient('/usuarios/me',options),u=r?.usuario;
 if(!u||['id','nombre','correo','rol','estado'].some(k=>typeof u[k]!=='string'))throw new ApiError('No fue posible leer el perfil.');
 return {id:u.id,nombre:u.nombre,correo:u.correo,rol:u.rol,estado:u.estado};
}
export async function actualizarPerfil(form){await apiClient('/usuarios/me',{method:'PUT',body:perfilBody(form)});}
export async function cambiarPassword(form){await apiClient('/usuarios/me/password',{method:'PUT',body:passwordBody(form)});}
