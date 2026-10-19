const mysql=require('mysql2');
const db=require('../config/db');
const servicio=require('../services/configuracionService');
function handler(escritura){return async(req,res)=>{
 if(!req.usuario?.id)return res.status(401).json({error:'Autenticación requerida.'});
 if(escritura)try{servicio.validar(req.body);}catch(e){return res.status(e.status===400?400:500).json({error:e.status===400?e.message:'Error interno del servidor.'});}
 let c;
 try{
  c=mysql.createConnection(db.dbConfig).promise();await c.beginTransaction();
  const configuracion=escritura?await servicio.actualizar(c,req.body,req.usuario.id):await servicio.consultar(c);
  await c.commit();return res.json({configuracion,...(escritura?{mensaje:'Configuración guardada correctamente.'}:{})});
 }catch(e){if(c)try{await c.rollback();}catch{/* Error original. */}return res.status(e.status||500).json({error:e.status?e.message:'No fue posible guardar o consultar la configuración.'});}
 finally{if(c)try{await c.end();}catch{/* Respuesta emitida. */}}
};}
exports.consultar=handler(false);exports.actualizar=handler(true);
