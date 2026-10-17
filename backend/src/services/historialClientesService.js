const {pedidoJuegoSQL}=require('./juegosPedidoService');
const {centavos}=require('./liquidacionService');
const dinero=n=>`${n/100n}.${String(n%100n).padStart(2,'0')}`;
const fallo=(status,message)=>Object.assign(new Error(message),{status});
const ambito="((p.sesion_mesa_id IS NOT NULL AND j.sesion_mesa_id=p.sesion_mesa_id) OR (p.sesion_mesa_id IS NULL AND j.sesion_mesa_id IS NULL AND j.pedido_id=p.id))";
const participacion=`EXISTS (SELECT 1 FROM jugadores j WHERE j.clientes_id=? AND ${ambito})`;
function entero(v,def,max){if(v===undefined)return def;if(typeof v!=='string'||! /^[1-9]\d*$/.test(v)||!Number.isSafeInteger(Number(v))||Number(v)>max)throw fallo(400,'Paginación inválida.');return Number(v);}
async function consultar(c,id,query={}){
 if(typeof id!=='string'||!id||id.trim()!==id||id.length>36)throw fallo(400,'Cliente inválido.');
 const pagina=entero(query.pagina,1,1000000),limite=entero(query.limite,20,100);
 const [[cliente]]=await c.query('SELECT id,nombre FROM clientes WHERE id=?',[id]);
 if(!cliente)throw fallo(404,'Cliente inexistente.');
 // EXISTS evita multiplicar pedidos por clientes, consumos o pagos de una visita.
 const where=`p.clientes_id=? OR ${participacion}`;
 const [[count]]=await c.query(`SELECT COUNT(*) AS total FROM pedidos p WHERE ${where}`,[id,id]);
 const [rows]=await c.query(`SELECT p.id,p.estado,p.sesion_mesa_id,
 DATE_FORMAT(p.creado_en,'%Y-%m-%dT%H:%i:%sZ') AS fecha,m.numero AS mesa,
 (p.clientes_id=?) AS cliente_del_pedido,${participacion} AS participa
 FROM pedidos p LEFT JOIN mesas m ON m.id=p.mesas_id WHERE ${where}
 ORDER BY p.creado_en DESC,p.id DESC LIMIT ? OFFSET ?`,[id,id,id,id,limite,(pagina-1)*limite]);
 if(!rows.length)return {cliente,datos:[],paginacion:{pagina,limite,total:Number(count.total),total_paginas:Math.ceil(Number(count.total)/limite)}};
 const ids=rows.map(r=>r.id),marks=ids.map(()=>'?').join(',');
 // Consultas por lote: coste constante por página, sin escrituras ni N+1.
 const [productos]=await c.query(`SELECT i.pedidos_id AS pedido_id,
 CAST(SUM(i.cantidad_pedida*i.precio_unitario) AS CHAR) AS total,
 CAST(SUM(CASE WHEN EXISTS (SELECT 1 FROM jugadores j WHERE j.id=i.participante_id AND j.clientes_id=? AND ${ambito}) THEN i.cantidad_pedida*i.precio_unitario ELSE 0 END) AS CHAR) AS consumo_cliente
 FROM pedido_items i JOIN pedidos p ON p.id=i.pedidos_id
 WHERE i.pedidos_id IN (${marks}) AND i.pedido_id=i.pedidos_id AND i.estado<>'cancelado' GROUP BY i.pedidos_id`,[id,...ids]);
 const [juegos]=await c.query(`SELECT ${pedidoJuegoSQL()} AS pedido_id,CAST(SUM(COALESCE(sj.costo_total,0)) AS CHAR) AS total,
 SUM(sj.estado='activa' OR sj.costo_total IS NULL) AS sin_finalizar
 FROM sesiones_juego sj WHERE sj.estado<>'cancelada' AND ${pedidoJuegoSQL()} IN (${marks}) GROUP BY pedido_id`,ids);
 const [pagos]=await c.query(`SELECT pa.pedidos_id AS pedido_id,CAST(SUM(pa.total_seleccionado) AS CHAR) AS total
 FROM pagos pa JOIN division_participantes dp ON dp.id=pa.participante_id AND dp.sesion_division_id=pa.sesion_division_id
 JOIN jugadores j ON j.id=dp.jugadores_id JOIN pedidos p ON p.id=pa.pedidos_id
 WHERE j.clientes_id=? AND ${ambito} AND pa.pedidos_id IN (${marks}) AND pa.estado='pagado' AND pa.verificacion_estado='verificado'
 GROUP BY pa.pedidos_id`,[id,...ids]);
 const map=values=>new Map(values.map(r=>[r.pedido_id,r]));
 const productMap=map(productos),gameMap=map(juegos),paymentMap=map(pagos);
 const datos=rows.map(r=>({...r,cliente_del_pedido:Boolean(r.cliente_del_pedido),participa:Boolean(r.participa),
  total_pedido:dinero(centavos(productMap.get(r.id)?.total||'0.00')+centavos(gameMap.get(r.id)?.total||'0.00')),
  total_definitivo:!Number(gameMap.get(r.id)?.sin_finalizar||0),
  consumo_cliente:dinero(centavos(productMap.get(r.id)?.consumo_cliente||'0.00')),
  pagos_atribuidos:dinero(centavos(paymentMap.get(r.id)?.total||'0.00'))}));
 return {cliente,datos,paginacion:{pagina,limite,total:Number(count.total),total_paginas:Math.ceil(Number(count.total)/limite)}};
}
module.exports={consultar};
