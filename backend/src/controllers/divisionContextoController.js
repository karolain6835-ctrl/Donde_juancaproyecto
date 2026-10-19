const mysql=require('mysql2');
const db=require('../config/db');
const {fechaLocalSQL}=require('../utils/fechaHora');
const {consultarPedido,calcularCuenta}=require('../services/liquidacionService');
const {divisionesActivasPedido}=require('../services/divisionesService');
const dinero=n=>`${n/100n}.${String(n%100n).padStart(2,'0')}`;
exports.obtener=async(req,res)=>{
 let c,abierta=false;
 try{
  c=mysql.createConnection(db.dbConfig).promise();
  // Un GET no reserva saldo ni decide cierres: todas las consultas comparten
  // el mismo snapshot MVCC y no compiten con los bloqueos de los pagos.
  await c.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');
  await c.query('START TRANSACTION WITH CONSISTENT SNAPSHOT, READ ONLY');abierta=true;
  const pedido=await consultarPedido(c,req.params.pedido_id);
  const cuenta=await calcularCuenta(c,pedido,{bloquear:false});
  const tieneDivisionActiva=(await divisionesActivasPedido(c,pedido.id,{bloquear:false})).length>0;
  const [[ambito]]=await c.query(`SELECT p.sesion_mesa_id,s.estado AS estado_visita,m.numero AS mesa_numero
   FROM pedidos p JOIN mesas m ON m.id=p.mesas_id LEFT JOIN sesiones_mesa s ON s.id=p.sesion_mesa_id WHERE p.id=?`,[pedido.id]);
  const [items]=await c.query(`SELECT pi.id,pi.productos_id,pr.nombre,pr.codigo,pi.participante_id,j.nombre AS cliente_nombre,
   pi.cantidad_pedida,pi.cantidad_pagada,pi.precio_unitario,pi.estado
   FROM pedido_items pi JOIN productos pr ON pr.id=pi.productos_id LEFT JOIN jugadores j ON j.id=pi.participante_id
   WHERE pi.pedidos_id=? AND pi.pedido_id=? AND pi.estado<>'cancelado' ORDER BY pi.id`,[pedido.id,pedido.id]);
  for(const item of items){
   const [asignaciones]=await c.query(`SELECT di.cantidad_asignada FROM division_items_detalle di
    LEFT JOIN division_participantes dp ON dp.id=di.participante_id
    LEFT JOIN sesiones_division_cuentas sd ON sd.id=dp.sesion_division_id
    WHERE di.pedido_item_id=? AND (sd.estado IS NULL OR sd.estado<>'cancelada')`,[item.id]);
   item.cantidad_asignada=asignaciones.reduce((n,r)=>n+r.cantidad_asignada,0);
   item.cantidad_disponible=Math.max(0,item.cantidad_pedida-item.cantidad_asignada-item.cantidad_pagada);
  }
  const [divisiones]=await c.query(`SELECT sd.id,sd.modalidad,sd.estado,sd.pedido_id,${fechaLocalSQL('sd.creado_en')} AS creado_en FROM sesiones_division_cuentas sd
   WHERE sd.sesion_mesa_id=? AND (sd.pedido_id=? OR (sd.pedido_id IS NULL AND (
    NOT EXISTS (SELECT 1 FROM division_participantes dp WHERE dp.sesion_division_id=sd.id) OR
    EXISTS (SELECT 1 FROM division_participantes dp JOIN division_items_detalle di ON di.participante_id=dp.id
     JOIN pedido_items pi ON pi.id=di.pedido_item_id WHERE dp.sesion_division_id=sd.id AND pi.pedidos_id=?))))
   ORDER BY sd.creado_en,sd.id`,[ambito.sesion_mesa_id,pedido.id,pedido.id]);
  await c.commit();abierta=false;return res.json({datos:{pedido:{...pedido,...ambito},saldo:dinero(cuenta.saldo),pendiente_verificacion:dinero(cuenta.pendienteVerificacion),total_definitivo:cuenta.totalDefinitivo,tiene_division_activa:tieneDivisionActiva,items,divisiones}});
 }catch(e){if(abierta)await c.rollback();console.error('Contexto de división:', new Error('Fallo interno; detalles sensibles omitidos.').stack);return res.status(e.status||500).json({error:e.status?e.message:'No fue posible cargar la cuenta para dividir.'});}
 finally{if(c)await c.end();}
};
