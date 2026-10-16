const fallo=mensaje=>Object.assign(new Error(mensaje),{status:400});
function filtros(q={}){
 const permitidos=['pagina','limite','fecha_desde','fecha_hasta','usuario','accion','modulo','entidad'];
 if(Object.keys(q).some(k=>!permitidos.includes(k)))throw fallo('Parámetro de auditoría no válido.');
 const entero=(v,def,max)=>{if(v===undefined)return def;if(typeof v!=='string'||! /^[1-9]\d*$/.test(v)||!Number.isSafeInteger(Number(v))||Number(v)>max)throw fallo('Paginación inválida.');return Number(v);};
 const pagina=entero(q.pagina,1,1000000),limite=entero(q.limite,20,100),offset=(pagina-1)*limite;
 const condiciones=[],valores=[];
 for(const [campo,columna,max]of [['usuario','a.usuarios_id',36],['accion','a.tipo_evento',100],['modulo','a.categoria',45],['entidad','a.entidad',36]])if(q[campo]!==undefined){
  if(typeof q[campo]!=='string'||!q[campo].trim()||q[campo]!==q[campo].trim()||q[campo].length>max)throw fallo('Filtro de auditoría inválido.');
  condiciones.push(`${columna}=?`);valores.push(q[campo]);
 }
 for(const campo of ['fecha_desde','fecha_hasta'])if(q[campo]!==undefined){
  const v=q[campo];if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(v)||!Number.isFinite(Date.parse(v))||new Date(v).toISOString().slice(0,10)!==v||v<'1000-01-01'||v>'9999-12-30')throw fallo('Fecha inválida. Usa AAAA-MM-DD.');
  condiciones.push(campo==='fecha_desde'?'a.creado_en>=?':'a.creado_en<DATE_ADD(?,INTERVAL 1 DAY)');valores.push(v);
 }
 if(q.fecha_desde&&q.fecha_hasta&&q.fecha_desde>q.fecha_hasta)throw fallo('La fecha inicial debe ser anterior o igual a la final.');
 return {pagina,limite,offset,where:condiciones.length?' WHERE '+condiciones.join(' AND '):'',valores};
}
// Proyección de lectura explícita: los textos libres y campos desconocidos no se publican.
const contenedores=new Set(['antes','despues','anterior','posterior','items','cuotas','cambios','totales']);
const numericos=new Set(['numero','cantidad','cantidad_pedida','cantidad_asignada','stock','stock_actual','stock_anterior','stock_antes','stock_despues','stock_observado','stock_minimo','precio_unitario','subtotal','total','total_pagado','total_seleccionado','total_asignado','total_objetivo','saldo','saldo_anterior','saldo_actual','saldo_nuevo','saldo_pendiente','pendiente_verificacion','version']);
const estados=new Set(['estado','estado_anterior','estado_nuevo','estado_compra','estado_pedido','tipo','modalidad','resultado','verificacion_estado','metodo_de_pago']);
const valoresEstado=new Set(['activo','inactivo','bloqueado','activa','vista','silenciada','resuelta','abierto','cerrado','cancelado','activa','completada','cancelada','disponible','ocupada','en_cobro','enviado','preparando','servido','pendiente','pagado','verificado','rechazado','exitoso','fallido','bajo','agotado','items','equitativa','total','personalizada','efectivo','nequi','daviplata','tarjeta','borrador','recibida','parcial','recibido','parcialmente_recibida']);
const sensible=k=>/password|passphrase|contrasen|hash|jwt|otp|token|secret|authorization|cookie|headers?|credential|api.?key|pin$/i.test(k.normalize('NFD').replace(/[\u0300-\u036f]/g,''));
function detalleSeguro(json){
 let omitido=false,nodos=0;
 if(typeof json==='string'&&json.length>100000)return {detalle:{},detalle_omitido:true};
 let origen;try{origen=typeof json==='string'?JSON.parse(json):json;}catch{return {detalle:{},detalle_omitido:true};}
 function visitar(obj,profundidad=0){
  if(!obj||typeof obj!=='object'||Array.isArray(obj)||profundidad>8||++nodos>500){omitido=true;return {};}
  const salida={};
  for(const [k,v]of Object.entries(obj)){
   if(sensible(k)){omitido=true;continue;}
   if(contenedores.has(k)){
    if(v===null)salida[k]=null;
    else if(Array.isArray(v)){if(v.length>100)omitido=true;salida[k]=v.slice(0,100).map(x=>visitar(x,profundidad+1));}
    else if(typeof v==='object')salida[k]=visitar(v,profundidad+1);
    else if(valoresEstado.has(v))salida[k]=v;else omitido=true;
   }else if(numericos.has(k)&&((typeof v==='number'&&Number.isFinite(v))||(typeof v==='string'&&/^-?\d{1,20}(\.\d{1,6})?$/.test(v))))salida[k]=v;
   else if(estados.has(k)&&valoresEstado.has(v))salida[k]=v;
   else if((k==='id'||k.endsWith('_id')||['creador_original','iniciador_original'].includes(k))&&typeof v==='string'&&/^[a-zA-Z0-9-]{1,36}$/.test(v))salida[k]=v;
   else omitido=true;
  }
  return salida;
 }
 return {detalle:visitar(origen),detalle_omitido:omitido};
}
async function listar(c,q){
 const f=filtros(q),from=' FROM auditoria a LEFT JOIN usuarios u ON u.id=a.usuarios_id';
 const [[conteo]]=await c.query(`SELECT COUNT(*) AS total${from}${f.where}`,f.valores);
 const [rows]=await c.query(`SELECT a.id,a.categoria,a.tipo_evento,a.entidad,a.entidad_id,a.resultado,
  DATE_FORMAT(a.creado_en,'%Y-%m-%dT%H:%i:%sZ') AS creado_en,a.usuarios_id,u.nombre AS usuario_nombre,a.cambios_json
  ${from}${f.where} ORDER BY a.creado_en DESC,a.id DESC LIMIT ? OFFSET ?`,[...f.valores,f.limite,f.offset]);
 const datos=rows.map(({cambios_json,...row})=>({...row,...detalleSeguro(cambios_json)}));
 return {datos,paginacion:{pagina:f.pagina,limite:f.limite,total:Number(conteo.total),total_paginas:Math.ceil(Number(conteo.total)/f.limite)}};
}
module.exports={filtros,detalleSeguro,listar};
