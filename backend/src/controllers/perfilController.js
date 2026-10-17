const mysql=require('mysql2');
const db=require('../config/db');
const servicio=require('../services/perfilService');
function handler(accion){return async(req,res)=>{
 const actor=req.usuario?.id;if(!actor)return res.status(401).json({error:'Autenticación requerida.'});
 try{if(Object.keys(req.query||{}).length)throw Object.assign(new Error('Esta operación no admite parámetros de usuario.'),{status:400});if(accion==='actualizar')servicio.validarPerfil(req.body);if(accion==='password')servicio.validarPassword(req.body);}catch(e){return res.status(e.status===400?400:500).json({error:e.status===400?e.message:'Error interno del servidor.'});}
 let c;
 try{
  c=mysql.createConnection(db.dbConfig).promise();await c.beginTransaction();
  let usuario;if(accion==='password')await servicio.cambiarPassword(c,actor,req.body);else usuario=accion==='actualizar'?await servicio.actualizar(c,actor,req.body):await servicio.consultar(c,actor);
  await c.commit();return res.json(accion==='password'?{mensaje:'Contraseña cambiada correctamente.'}:{usuario,...(accion==='actualizar'?{mensaje:'Perfil actualizado correctamente.'}:{})});
 }catch(e){if(c)try{await c.rollback();}catch{/* Conservar error original. */}if(e.code==='ER_DUP_ENTRY')return res.status(409).json({error:'Ya existe un usuario con ese correo.'});return res.status(e.status||500).json({error:e.status?e.message:'No fue posible completar la operación del perfil.'});}
 finally{if(c)try{await c.end();}catch{/* Respuesta emitida. */}}
};}
exports.consultar=handler('consultar');exports.actualizar=handler('actualizar');exports.password=handler('password');
