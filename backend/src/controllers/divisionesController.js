const mysql = require('mysql2');
const {horaBogotaSQL,fechaLocalSQL}=require('../utils/fechaHora');
const { randomUUID } = require('node:crypto');
const { ejecutor } = require('../services/identidadService');
const { sesionActiva } = require('../services/sesionesMesaService');
const { validar, asignar, fallo } = require('../services/divisionesService');
const db = require('../config/db');
const cuotas = require('../services/divisionCuotasService');
async function transaccion(req,res,operation,{soloLectura=false}={}){
 const actor=ejecutor(req,res);if(!actor)return;
 let c;
 try{c=mysql.createConnection(db.dbConfig).promise();
  if(soloLectura){await c.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');await c.query('START TRANSACTION WITH CONSISTENT SNAPSHOT, READ ONLY');}
  else await c.beginTransaction();
  const r=await operation(c,actor);await c.commit();return res.status(r.status).json({exito:true,data:r.data});}
 catch(e){if(c)await c.rollback();console.error('Division:', new Error('Fallo interno; detalles sensibles omitidos.').stack);return res.status(e.status||(['ER_DUP_ENTRY','ER_LOCK_DEADLOCK','ER_LOCK_WAIT_TIMEOUT'].includes(e.code)?409:500)).json({error:e.status?e.message:'No se pudo procesar la division. Reintenta con la misma clave.'});}
 finally{if(c)await c.end();}
}
const iniciarSesionDivision=(req,res)=>transaccion(req,res,async(c,actor)=>{
 const {mesas_id,modalidad}=req.body||{};
 if(typeof mesas_id!=='string'||!mesas_id.trim()||!['items','equitativa','total','personalizada'].includes(modalidad))throw fallo(400,'Indica mesa y modalidad items, equitativa, total o personalizada.');
 const [[mesa]]=await c.query('SELECT id FROM mesas WHERE id=? FOR UPDATE',[mesas_id]);
 if(!mesa)throw fallo(404,'La mesa no existe.');
 const visita=await sesionActiva(c,mesas_id);if(!visita)throw fallo(409,'La mesa no tiene una visita activa.');
 const id=randomUUID();await c.query(`INSERT INTO sesiones_division_cuentas(id,modalidad,usuarios_id,mesas_id,sesion_mesa_id,creado_en) VALUES (?,?,?,?,?,${horaBogotaSQL})`,[id,modalidad,actor,mesas_id,visita.id]);
 return {status:201,data:{id,modalidad,usuarios_id:actor,mesas_id,sesion_mesa_id:visita.id}};
});
const asignarItemsACliente=(req,res)=>{
 const actor=ejecutor(req,res);if(!actor)return;
 let body,key=req.get?.('Idempotency-Key');try{body=validar(req.body,key);}catch(e){return res.status([400,409].includes(e.status)?e.status:500).json({error:[400,409].includes(e.status)?e.message:'Error interno del servidor.'});}
 return transaccion(req,res,c=>asignar(c,req.params.id,body,key,actor));
};



const obtenerResumenDivision=(req,res)=>transaccion(req,res,async c=>{
 const [[division]]=await c.query(`SELECT *,${fechaLocalSQL('creado_en')} AS creado_en FROM sesiones_division_cuentas WHERE id=?`,[req.params.id]);
 if(!division)throw fallo(404,'La división no existe.');
 return {status:200,data:await cuotas.resumen(c,division,{bloquear:false})};
},{soloLectura:true});
const definirCuotas=(req,res)=>transaccion(req,res,async(c,actor)=>cuotas.configurar(c,await cuotas.bloquear(c,req.params.id),req.body,req.get?.('Idempotency-Key'),actor));
const cancelarDivision=(req,res)=>transaccion(req,res,async(c,actor)=>cuotas.cambiarEstado(c,await cuotas.bloquear(c,req.params.id),'cancelada',actor));
const completarDivision=(req,res)=>transaccion(req,res,async(c,actor)=>cuotas.cambiarEstado(c,await cuotas.bloquear(c,req.params.id),'completada',actor));
module.exports={iniciarSesionDivision,asignarItemsACliente,obtenerResumenDivision,definirCuotas,cancelarDivision,completarDivision};
