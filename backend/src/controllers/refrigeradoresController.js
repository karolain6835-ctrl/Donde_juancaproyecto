const mysql=require('mysql2');
const db=require('../config/db');
const servicio=require('../services/refrigeradoresService');
function handler(operacion){return async(req,res)=>{
 if(!req.usuario?.id)return res.status(401).json({error:'Autenticación requerida.'});
 try{if(operacion!=='listar')servicio.validar(req.body);if(operacion==='editar')servicio.validarId(req.params.id);}catch(e){return res.status(400).json({error:e.message});}
 let c;
 try{
  c=mysql.createConnection(db.dbConfig).promise();await c.beginTransaction();
  const resultado=operacion==='listar'?await servicio.listar(c):{refrigerador:await servicio.guardar(c,req.body,req.usuario.id,operacion==='editar'?req.params.id:undefined),mensaje:'Refrigerador guardado correctamente.'};
  await c.commit();return res.status(operacion==='crear'?201:200).json(resultado);
 }catch(e){if(c)try{await c.rollback();}catch{/* Conservar error original. */}return res.status(e.status||500).json({error:e.status?e.message:'No fue posible completar la operación de refrigeradores.'});}
 finally{if(c)try{await c.end();}catch{/* Respuesta emitida. */}}
};}
exports.listar=handler('listar');exports.crear=handler('crear');exports.editar=handler('editar');
