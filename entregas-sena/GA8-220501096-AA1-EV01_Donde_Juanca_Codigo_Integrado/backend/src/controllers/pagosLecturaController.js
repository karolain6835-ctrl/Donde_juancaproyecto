const mysql=require('mysql2');
const db=require('../config/db');
const {listar}=require('../services/pagosLecturaService');
exports.listar=async(req,res)=>{
 let c,abierta=false;
 try{
  c=mysql.createConnection(db.dbConfig).promise();
  await c.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');
  await c.query('START TRANSACTION WITH CONSISTENT SNAPSHOT, READ ONLY');abierta=true;
  const data=await listar(c,req.query);await c.commit();abierta=false;return res.json(data);
 }catch(e){if(abierta)await c.rollback();return res.status(e.status||500).json({error:e.status?e.message:'No fue posible cargar los pagos.'});}
 finally{if(c)await c.end();}
};
