const {fechaLocalSQL}=require('../utils/fechaHora');
const fallo=message=>Object.assign(new Error(message),{status:400});
function filtros(q={}){
 const args=[],where=[];
 const entero=(v,def,max)=>{if(v===undefined)return def;if(!/^[1-9]\d*$/.test(String(v))||Number(v)>max)throw fallo('Paginación inválida.');return Number(v);};
 const pagina=entero(q.pagina,1,1000000),limite=entero(q.limite,20,100);
 if(q.estado){if(!['pendiente','verificado','rechazado'].includes(q.estado))throw fallo('Estado inválido.');where.push('p.verificacion_estado=?');args.push(q.estado);}
 if(q.metodo_de_pago){if(!['efectivo','nequi','daviplata','tarjeta'].includes(q.metodo_de_pago))throw fallo('Método inválido.');where.push('p.metodo_de_pago=?');args.push(q.metodo_de_pago);}
 if(q.mesas_id){if(typeof q.mesas_id!=='string'||q.mesas_id.length>36)throw fallo('Mesa inválida.');where.push('o.mesas_id=?');args.push(q.mesas_id);}
 for(const field of ['desde','hasta'])if(q[field]){
  if(typeof q[field]!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(q[field])||!Number.isFinite(Date.parse(q[field]))||new Date(q[field]).toISOString().slice(0,10)!==q[field])throw fallo('Fecha inválida. Usa AAAA-MM-DD.');
  where.push(field==='desde'?'p.creado_en>=?':'p.creado_en<DATE_ADD(?,INTERVAL 1 DAY)');args.push(q[field]);
 }
 if(q.desde&&q.hasta&&q.desde>q.hasta)throw fallo('El rango de fechas es inválido.');
 return {pagina,limite,args,where:where.length?' WHERE '+where.join(' AND '):''};
}
async function listar(c,q){
 const f=filtros(q),from=' FROM pagos p LEFT JOIN pedidos o ON o.id=p.pedidos_id';
 const [[r]]=await c.query(`SELECT COUNT(*) total,
  COALESCE(SUM(p.verificacion_estado='verificado' AND p.estado='pagado'),0) verificados,
  COALESCE(SUM(p.verificacion_estado='pendiente' AND p.estado='pendiente'),0) pendientes,
  COALESCE(SUM(p.verificacion_estado='rechazado'),0) rechazados,
  CAST(COALESCE(SUM(CASE WHEN p.verificacion_estado='verificado' AND p.estado='pagado' THEN p.total_seleccionado ELSE 0 END),0) AS CHAR) total_verificado${from}${f.where}`,f.args);
 const [datos]=await c.query(`SELECT p.id,p.estado,p.verificacion_estado,p.metodo_de_pago,
  CAST(p.total_seleccionado AS CHAR) total_seleccionado,
  ${fechaLocalSQL('p.creado_en')} creado_en,
  DATE_FORMAT(p.verificado_en,'%Y-%m-%dT%H:%i:%sZ') verificado_en,
  p.pedidos_id,p.sesion_division_id,o.mesas_id,m.numero mesa_numero,
  CASE WHEN p.sesion_division_id IS NOT NULL THEN dp.nombre_cliente ELSE cl.nombre END cliente_nombre,
  u.nombre registrado_por,v.nombre procesado_por,
  DATE_FORMAT(a.creado_en,'%Y-%m-%dT%H:%i:%sZ') procesado_en
  ${from} LEFT JOIN mesas m ON m.id=o.mesas_id LEFT JOIN clientes cl ON cl.id=o.clientes_id
  LEFT JOIN division_participantes dp ON dp.id=p.participante_id AND dp.sesion_division_id=p.sesion_division_id
  LEFT JOIN usuarios u ON u.id=p.usuarios_id
  LEFT JOIN auditoria a ON a.id=(SELECT au.id FROM auditoria au WHERE au.entidad='pagos' AND au.entidad_id=p.id
   AND au.tipo_evento IN ('pago_verificado','pago_rechazado') AND au.resultado='exitoso' ORDER BY au.creado_en DESC,au.id DESC LIMIT 1)
  LEFT JOIN usuarios v ON v.id=a.usuarios_id
  ${f.where} ORDER BY p.creado_en DESC,p.id DESC LIMIT ? OFFSET ?`,[...f.args,f.limite,(f.pagina-1)*f.limite]);
 return {datos,paginacion:{total:Number(r.total),pagina:f.pagina,limite:f.limite,totalPaginas:Math.ceil(Number(r.total)/f.limite)},resumen:{verificados:Number(r.verificados),pendientes:Number(r.pendientes),rechazados:Number(r.rechazados),total_verificado:r.total_verificado}};
}
module.exports={listar,filtros};
