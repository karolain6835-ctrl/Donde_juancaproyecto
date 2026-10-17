const mysql=require('mysql2');
const db=require('../config/db');
exports.listar=async(req,res)=>{
 let c;
 try{
  c=mysql.createConnection(db.dbConfig).promise();
  const [[division]]=await c.query('SELECT id FROM sesiones_division_cuentas WHERE id=?',[req.params.id]);
  if(!division)return res.status(404).json({error:'La división no existe.'});
  const [pagos]=await c.query(`SELECT p.id,p.metodo_de_pago,p.total_seleccionado,p.estado,p.verificacion_estado,
   p.creado_en,p.verificado_en,p.pedidos_id,p.sesion_division_id,p.participante_id,dp.nombre_cliente
   FROM pagos p LEFT JOIN division_participantes dp ON dp.id=p.participante_id AND dp.sesion_division_id=p.sesion_division_id
   WHERE p.sesion_division_id=? ORDER BY p.creado_en,p.id`,[division.id]);
  return res.json({datos:pagos});
 }catch(e){console.error('Pagos de división:', new Error('Fallo interno; detalles sensibles omitidos.').stack);return res.status(500).json({error:'No fue posible consultar los pagos de esta división.'});}
 finally{if(c)await c.end();}
};
