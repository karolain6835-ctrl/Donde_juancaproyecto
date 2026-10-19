const bcrypt=require('bcrypt');
const {registrarAuditoria}=require('./auditoriaService');
const fallo=(status,message)=>Object.assign(new Error(message),{status});
function campos(body,keys){if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).some(k=>!keys.includes(k))||keys.some(k=>!Object.hasOwn(body,k)))throw fallo(400,'Campos de perfil inválidos.');}
function validarPerfil(body){
 campos(body,['nombre','correo']);
 if(typeof body.nombre!=='string'||!body.nombre.trim()||[...body.nombre.trim()].length>100||/[\x00-\x1f]/.test(body.nombre))throw fallo(400,'Indica un nombre de máximo 100 caracteres.');
 if(typeof body.correo!=='string'||body.correo.trim().length>150||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.correo.trim()))throw fallo(400,'Indica un correo válido.');
 return {nombre:body.nombre.trim(),correo:body.correo.trim()};
}
function validarPassword(body){
 campos(body,['contrasena_actual','contrasena_nueva','confirmar_contrasena']);
 for(const k of ['contrasena_actual','contrasena_nueva','confirmar_contrasena'])if(typeof body[k]!=='string'||!body[k].trim()||Buffer.byteLength(body[k],'utf8')>72)throw fallo(400,'Las contraseñas son obligatorias y admiten máximo 72 bytes.');
 if(body.contrasena_nueva!==body.confirmar_contrasena)throw fallo(400,'La confirmación no coincide con la nueva contraseña.');
 if(body.contrasena_actual===body.contrasena_nueva)throw fallo(400,'La nueva contraseña debe ser diferente de la actual.');
 return body;
}
async function consultar(c,actor){
 const [[usuario]]=await c.query("SELECT u.id,u.nombre,u.email AS correo,r.nombre AS rol,u.estado FROM usuarios u JOIN roles r ON r.id=u.roles_id WHERE u.id=? AND u.estado='activo'",[actor]);
 if(!usuario)throw fallo(401,'La sesión ya no está disponible.');return usuario;
}
async function bloquear(c,actor){
 const [[u]]=await c.query('SELECT id,nombre,email,estado,password_hash FROM usuarios WHERE id=? FOR UPDATE',[actor]);
 if(!u||u.estado!=='activo')throw fallo(401,'La sesión ya no está disponible.');return u;
}
async function actualizar(c,actor,body){
 const data=validarPerfil(body),u=await bloquear(c,actor);
 await c.query('UPDATE usuarios SET nombre=?,email=? WHERE id=?',[data.nombre,data.correo,actor]);
 await registrarAuditoria(c,actor,'usuarios','perfil_actualizado','usuarios',actor,{campos_modificados:['nombre','correo'].filter(k=>data[k]!==u[k==='correo'?'email':k])});
 return consultar(c,actor);
}
async function cambiarPassword(c,actor,body){
 validarPassword(body);const u=await bloquear(c,actor);
 if(!/^\$2[ab]\$/.test(u.password_hash)||!await bcrypt.compare(body.contrasena_actual,u.password_hash))throw fallo(400,'La contraseña actual es incorrecta.');
 const hash=await bcrypt.hash(body.contrasena_nueva,12);
 await c.query('UPDATE usuarios SET password_hash=? WHERE id=?',[hash,actor]);
 // Nunca registrar contraseñas, hashes ni cuerpos de petición.
 await registrarAuditoria(c,actor,'usuarios','contrasena_cambiada','usuarios',actor,{});
}
module.exports={validarPerfil,validarPassword,consultar,actualizar,cambiarPassword};
