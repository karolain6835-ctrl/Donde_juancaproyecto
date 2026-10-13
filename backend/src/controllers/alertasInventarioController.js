const mysql=require('mysql2');
const db=require('../config/db');
const s=require('../services/alertasInventarioService');
const {ejecutor}=require('../services/identidadService');
const ejecutar=async(res,operacion,lectura=false)=>{
 let c,abierta=false;
 try{
  c=mysql.createConnection(db.dbConfig).promise();
  if(lectura){await c.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');await c.query('START TRANSACTION WITH CONSISTENT SNAPSHOT, READ ONLY');}
  else await c.beginTransaction();abierta=true;
  const body=await operacion(c);await c.commit();abierta=false;return res.json(body);
 }catch(e){if(abierta){try{await c.rollback();}catch(r){console.error('Rollback alertas:',r.code);}}
  const status=['ER_DUP_ENTRY','ER_LOCK_DEADLOCK','ER_LOCK_WAIT_TIMEOUT'].includes(e.code)?409:e.status||500;
  return res.status(status).json({error:e.status?e.message:status===409?'Conflicto concurrente; reintente.':'No se pudo completar la operacion de alertas.'});
 }finally{if(c){try{await c.end();}catch(e){console.error('Conexion alertas:',e.code);}}}
};
exports.listar=(req,res)=>ejecutar(res,c=>s.listar(c,req.query||{}),true);
exports.detalle=(req,res)=>ejecutar(res,async c=>({alerta:await s.detalle(c,req.params.id)}),true);
exports.accion=accion=>(req,res)=>{const actor=ejecutor(req,res);if(!actor)return;return ejecutar(res,c=>s.actuar(c,req.params.id,accion,actor,req.body));};
