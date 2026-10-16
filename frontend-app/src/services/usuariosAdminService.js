import {apiClient} from './apiClient.js';
import {invalidResponse} from './catalogoContract.js';
import {operationFail,operationPath} from './operacionContract.js';
export const rolesUsuarios=Object.freeze(['Administrador','SuperAdmin','Mesero','Mesera','Bartender','Cajero']);
export const estadosUsuarios=Object.freeze({activo:'Activo',inactivo:'Inactivo',bloqueado:'Bloqueado'});
function usuarioSeguro(u){
 if(typeof u?.id!=='string'||!(u.nombre===null||typeof u.nombre==='string')||typeof u.correo!=='string'||!rolesUsuarios.includes(u.rol)||!(u.estado===null||Object.hasOwn(estadosUsuarios,u.estado)))throw invalidResponse('usuarios');
 return {id:u.id,nombre:u.nombre,correo:u.correo,rol:u.rol,estado:u.estado};
}
export async function listarUsuariosAdmin(options){
 const rows=(await apiClient('/usuarios',options))?.datos;
 if(!Array.isArray(rows))throw invalidResponse('usuarios');return rows.map(usuarioSeguro);
}
export async function listarRolesUsuarios(options){
 const rows=(await apiClient('/usuarios/roles',options))?.datos;
 if(!Array.isArray(rows)||rows.some(r=>!Number.isSafeInteger(r?.id)||!rolesUsuarios.includes(r.nombre)))throw invalidResponse('roles');
 return rows.map(({id,nombre})=>({id,nombre}));
}
export function usuarioAdminBody(form,roles){
 if(typeof form.nombre!=='string'||!form.nombre.trim()||[...form.nombre.trim()].length>100)operationFail('Escribe un nombre de hasta 100 caracteres.');
 if(typeof form.correo!=='string'||form.correo.trim().length>150||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.correo.trim()))operationFail('Escribe un correo válido.');
 const rol=roles.find(r=>String(r.id)===String(form.roles_id)&&rolesUsuarios.includes(r.nombre));
 if(!rol)operationFail('Selecciona un rol válido.');
 if(typeof form.contrasena!=='string'||!form.contrasena.trim()||new TextEncoder().encode(form.contrasena).length>72)operationFail('Escribe una contraseña de hasta 72 bytes.');
 if(form.confirmacion!==form.contrasena)operationFail('Las contraseñas no coinciden.');
 return {nombre:form.nombre.trim(),correo:form.correo.trim(),roles_id:rol.id,contrasena:form.contrasena};
}
export async function crearUsuarioAdmin(body){
 return usuarioSeguro((await apiClient('/usuarios/registrar',{method:'POST',body}))?.usuario);
}
export async function cambiarEstadoUsuarioAdmin(id,estado){
 if(!['activo','inactivo'].includes(estado))operationFail('Selecciona Activo o Inactivo.');
 let r;
 try{r=await apiClient(`/usuarios/${operationPath(id)}/estado`,{method:'PUT',body:{estado}});}
 catch(e){if(typeof e.data?.msg==='string')e.message=e.data.msg;throw e;}
 if(r?.ok!==true||r.data?.usuario_id!==id||r.data?.nuevo_estado!==estado)throw invalidResponse('estado del usuario');
 return r;
}
