// Fragmento SQL interno: alias provistos por código, nunca por la petición.
// Una sola expresión de padre evita duplicar sesiones con ambas referencias.
// Conservar exclusión de históricos cancelados, incluso después del backfill.
function pedidoJuegoSQL(alias='sj',incluirCancelados=false){
 if(!/^[a-z][a-z0-9_]*$/i.test(alias))throw new Error('Alias SQL inválido.');
 return `(CASE WHEN ${alias}.pedido_items_id IS NULL THEN ${alias}.pedidos_id ELSE
  (SELECT pi_juego.pedidos_id FROM pedido_items pi_juego WHERE pi_juego.id=${alias}.pedido_items_id
   AND pi_juego.pedido_id=pi_juego.pedidos_id
   ${incluirCancelados?'':"AND pi_juego.estado<>'cancelado'"}
   AND (${alias}.pedidos_id IS NULL OR ${alias}.pedidos_id=pi_juego.pedidos_id)) END)`;
}
module.exports={pedidoJuegoSQL};
