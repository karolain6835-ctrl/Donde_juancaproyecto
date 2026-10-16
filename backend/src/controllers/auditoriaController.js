const mysql=require('mysql2');
const db=require('../config/db');
const servicio=require('../services/auditoriaLecturaService');
exports.listar=async(req,res)=>{
 if(!req.usuario?.id)return res.status(401).json({error:'Autenticación requerida.'});
 // Validar antes de abrir la conexión; la identidad proviene exclusivamente del JWT.
 try{servicio.filtros(req.query);}catch(e){return res.status(400).json({error:e.message});}
 let c;
 try{
  c=mysql.createConnection(db.dbConfig).promise();await c.beginTransaction();
  const r=await servicio.listar(c,req.query);await c.commit();return res.json(r);
 }catch(e){if(c)try{await c.rollback();}catch{/* No exponer información SQL. */}return res.status(500).json({error:'No fue posible consultar la auditoría.'});}
 finally{if(c)try{await c.end();}catch{/* La respuesta ya fue emitida. */}}
};
