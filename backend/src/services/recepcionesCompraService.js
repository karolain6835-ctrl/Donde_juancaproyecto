const { randomUUID } = require('node:crypto');
const { errorCompra: error, idValido, filaEscrita, decimal, consultaCompras } = require('./comprasService');
const { registrarAuditoria } = require('./auditoriaService');
const MAX_DINERO=9999999999n, MAX_VERSION=18446744073709551615n;
const centavos=v=>{
  if(!/^\d+(\.\d{1,2})?$/.test(String(v)))throw error(409,'Costo inconsistente.');
  const [e,d='']=String(v).split('.');return BigInt(e)*100n+BigInt(d.padEnd(2,'0'));
};
const dinero=n=>{if(n<0n||n>MAX_DINERO)throw error(409,'Importe fuera de DECIMAL(10,2).');return decimal(n);};
const calcularCPP=(q,c,r,p)=>{
  if(!Number.isInteger(q)||q<0||!Number.isInteger(r)||r<=0||q+r>2147483647)throw error(409,'Existencia fuera del rango permitido.');
  const n=BigInt(q)*centavos(c)+BigInt(r)*centavos(p),d=BigInt(q+r),cpp=(2n*n+d)/(2n*d);
  return {stock:q+r,cpp:dinero(cpp),residuo:(n-cpp*d).toString()};
};
const bloquear=async(c,id)=>{
  if(!idValido(id))throw error(400,'ID de compra invalido.');
  const [[compra]]=await c.query('SELECT id,estado,usuarios_id,modelo_recepcion,CAST(total_recibido AS CHAR) AS total_recibido FROM compras WHERE id=? FOR UPDATE',[id]);
  if(!compra)throw error(404,'Compra no encontrada.');return compra;
};
const items=async(c,compra,bloquearItems=false)=>{
  const [filas]=await c.query(
    'SELECT id,cantidad,CAST(precio_unitario AS CHAR) AS precio_unitario,compras_id,productos_id,cantidad_cancelada FROM compra_items WHERE compras_id=? ORDER BY productos_id,id'+(bloquearItems?' FOR UPDATE':''),[compra.id]);
  if(compra.modelo_recepcion!=='v2')return filas.map(f=>({...f,cantidad_recibida:null,cantidad_cancelada:null,cantidad_pendiente:null}));
  const [recibidos]=await c.query(
    "SELECT ri.compra_items_id,SUM(ri.cantidad_recibida) AS cantidad FROM recepcion_compra_items ri JOIN recepciones_compra r ON r.id=ri.recepciones_compra_id WHERE r.compras_id=? AND r.estado='confirmada' GROUP BY ri.compra_items_id",[compra.id]);
  const mapa=new Map(recibidos.map(r=>[r.compra_items_id,Number(r.cantidad)]));
  return filas.map(f=>{
    const cantidad_recibida=mapa.get(f.id)||0,cantidad_pendiente=f.cantidad-cantidad_recibida-f.cantidad_cancelada;
    if(!Number.isInteger(f.cantidad)||f.cantidad<=0||!Number.isInteger(f.cantidad_cancelada)||f.cantidad_cancelada<0||cantidad_pendiente<0)throw error(409,'Cantidades de compra inconsistentes.');
    return {...f,cantidad_recibida,cantidad_pendiente};
  });
};
const adoptar=async(c,compra)=>{
  if(compra.modelo_recepcion==='v2')return;
  if(compra.estado!=='pendiente')throw error(409,'Compra historica sin recepciones reconstruibles.');
  const [previos]=await c.query("SELECT id FROM movimientos_inventario WHERE referencia_tipo='compra' AND referencia_id=? LIMIT 1",[compra.id]);
  if(previos.length)throw error(409,'Compra legado con movimientos previos; requiere conciliacion.');
  filaEscrita((await c.query("UPDATE compras SET modelo_recepcion='v2' WHERE id=?",[compra.id]))[0]);
  await c.query('UPDATE compra_items SET cantidad_cancelada=0 WHERE compras_id=? AND cantidad_cancelada IS NULL',[compra.id]);
  compra.modelo_recepcion='v2';
};
const recalcular=async(c,compra)=>{
  const filas=await items(c,compra);let recibida=0,pendiente=0,cancelada=0,total=0n;
  for(const f of filas){recibida+=f.cantidad_recibida;pendiente+=f.cantidad_pendiente;cancelada+=f.cantidad_cancelada;total+=BigInt(f.cantidad_recibida)*centavos(f.precio_unitario);}
  const estado=pendiente>0?(recibida>0?'parcialmente_recibida':'pendiente'):(recibida>0?(cancelada>0?'cerrada_parcial':'recibida'):'cancelada');
  filaEscrita((await c.query('UPDATE compras SET estado=?,total_recibido=? WHERE id=?',[estado,dinero(total),compra.id]))[0]);
  const [[datos]]=await c.query(consultaCompras+' WHERE c.id=?',[compra.id]);return datos;
};
const hora=async c=>(await c.query("SELECT DATE_FORMAT(UTC_TIMESTAMP(),'%Y-%m-%d %H:%i:%s') AS ahora"))[0][0].ahora;
const detalleRecepcion=async(c,compraId,id)=>{
  if(!idValido(id))throw error(400,'ID de recepcion invalido.');
  const [[r]]=await c.query("SELECT id,compras_id,estado,recibida_por,DATE_FORMAT(recibida_en,'%Y-%m-%dT%H:%i:%sZ') AS recibida_en,clave_idempotencia,reversada_por,DATE_FORMAT(reversada_en,'%Y-%m-%dT%H:%i:%sZ') AS reversada_en,motivo_reverso FROM recepciones_compra WHERE id=? AND compras_id=?",[id,compraId]);
  if(!r)throw error(404,'Recepcion no encontrada.');
  const [lineas]=await c.query('SELECT id,recepciones_compra_id,compra_items_id,productos_id,cantidad_recibida,CAST(precio_unitario AS CHAR) AS precio_unitario,movimiento_entrada_id,movimiento_reverso_id FROM recepcion_compra_items WHERE recepciones_compra_id=? ORDER BY compra_items_id',[r.id]);
  for(const l of lineas){
    const [historial]=await c.query("SELECT id,productos_id,compras_id,recepcion_compra_items_id,evento,cantidad,CAST(costo_unitario AS CHAR) AS costo_unitario,stock_antes,stock_despues,CAST(cpp_antes AS CHAR) AS cpp_antes,CAST(cpp_despues AS CHAR) AS cpp_despues,CAST(version_antes AS CHAR) AS version_antes,CAST(version_despues AS CHAR) AS version_despues,CAST(residuo_redondeo_centavos AS CHAR) AS residuo_redondeo_centavos,usuarios_id,DATE_FORMAT(creado_en,'%Y-%m-%dT%H:%i:%sZ') AS creado_en FROM historial_costos_recepciones WHERE recepcion_compra_items_id=? ORDER BY version_antes",[l.id]);
    l.historial=historial;
    const [movimientos]=await c.query("SELECT id,tipo,cantidad,stock_antes,stock_despues,referencia_tipo,referencia_id,productos_id,usuarios_id,DATE_FORMAT(creado_en,'%Y-%m-%dT%H:%i:%sZ') AS creado_en FROM movimientos_inventario WHERE id IN (?,?)",[l.movimiento_entrada_id,l.movimiento_reverso_id]);
    l.movimiento_entrada=movimientos.find(m=>m.id===l.movimiento_entrada_id)??null;
    l.movimiento_reverso=movimientos.find(m=>m.id===l.movimiento_reverso_id)??null;
  }
  return {...r,items:lineas};
};
const productosBloqueados=async(c,ids)=>{
  const mapa=new Map();
  for(const id of [...new Set(ids)].sort()){
    const [[p]]=await c.query('SELECT id,cantidad_disponible,CAST(costo_promedio_ponderado AS CHAR) AS cpp,CAST(version_inventario AS CHAR) AS version FROM productos WHERE id=? FOR UPDATE',[id]);
    if(!p)throw error(404,'Producto no encontrado.');
    if(p.cantidad_disponible<0||BigInt(p.version)>=MAX_VERSION)throw error(409,'Inventario requiere conciliacion.');
    mapa.set(id,p);
  }return mapa;
};
const movimiento=async(c,actor,compra,p,cantidad,despues,fecha)=>{
  const id=randomUUID();filaEscrita((await c.query(
    "INSERT INTO movimientos_inventario (id,tipo,cantidad,stock_antes,stock_despues,referencia_tipo,referencia_id,productos_id,usuarios_id,creado_en) VALUES (?,'compra',?,?,?,'compra',?,?,?,?)",
    [id,cantidad,p.cantidad_disponible,despues,compra.id,p.id,actor,fecha]))[0]);return id;
};
const actualizarProducto=async(c,p,stock,cpp)=>{
  filaEscrita((await c.query('UPDATE productos SET cantidad_disponible=?,costo_promedio_ponderado=? WHERE id=?',[stock,cpp,p.id]))[0]);
  const [[r]]=await c.query('SELECT CAST(version_inventario AS CHAR) AS version FROM productos WHERE id=?',[p.id]);
  if(BigInt(r.version)!==BigInt(p.version)+1n)throw new Error('Version de inventario no actualizada por la BD.');
  return r.version;
};
const historial=async(c,actor,compra,linea,p,cantidad,stock,cpp,version,residuo,fecha,evento)=>{
  filaEscrita((await c.query('INSERT INTO historial_costos_recepciones (id,productos_id,compras_id,recepcion_compra_items_id,evento,cantidad,costo_unitario,stock_antes,stock_despues,cpp_antes,cpp_despues,version_antes,version_despues,residuo_redondeo_centavos,usuarios_id,creado_en) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
    [randomUUID(),p.id,compra.id,linea.id,evento,cantidad,linea.precio_unitario,p.cantidad_disponible,stock,p.cpp,cpp,p.version,version,residuo,actor,fecha]))[0]);
};
const recibir=async(c,id,body,actor,key)=>{
  if(body!==undefined&&(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).some(k=>k!=='items')))throw error(400,'Body de recepcion invalido.');
  const explicita=body&&Object.hasOwn(body,'items');
  if(key!==undefined&&(!explicita||typeof key!=='string'||!/^[!-~]{1,64}$/.test(key)))throw error(400,'Idempotency-Key requiere items explicitos y hasta 64 caracteres ASCII visibles.');
  if(explicita&&(!Array.isArray(body.items)||!body.items.length))throw error(400,'items no puede estar vacio.');
  const compra=await bloquear(c,id);
  let filas=await items(c,compra,true),solicitadas=[];const vistas=new Set();
  if(explicita)for(const entrada of body.items){
    if(!entrada||typeof entrada!=='object'||Object.keys(entrada).some(k=>!['compra_item_id','cantidad_recibida'].includes(k))||!idValido(entrada.compra_item_id)||!Number.isInteger(entrada.cantidad_recibida)||entrada.cantidad_recibida<=0||entrada.cantidad_recibida>2147483647)throw error(400,'Linea de recepcion invalida.');
    const f=filas.find(f=>f.id.toLowerCase()===entrada.compra_item_id.toLowerCase());
    if(!f)throw error(400,'Item ajeno a la compra.');if(vistas.has(f.id))throw error(400,'Linea repetida.');vistas.add(f.id);
    solicitadas.push({f,cantidad:entrada.cantidad_recibida});
  }
  if(key!==undefined){
    const [[existente]]=await c.query('SELECT id FROM recepciones_compra WHERE compras_id=? AND clave_idempotencia=?',[compra.id,key]);
    if(existente){const r=await detalleRecepcion(c,compra.id,existente.id);
      if(r.items.length!==solicitadas.length||!solicitadas.every(s=>r.items.some(l=>l.compra_items_id===s.f.id&&l.cantidad_recibida===s.cantidad)))throw error(409,'Idempotency-Key reutilizada con contenido distinto.');
      const [[datos]]=await c.query(consultaCompras+' WHERE c.id=?',[compra.id]);return {body:{mensaje:'Recepcion ya registrada.',datos,recepcion:r}};
    }
  }
  if(!['pendiente','parcialmente_recibida'].includes(compra.estado))throw error(409,'La compra no admite nuevas recepciones.');
  await adoptar(c,compra);filas=await items(c,compra);
  if(explicita)solicitadas=solicitadas.map(s=>({...s,f:filas.find(f=>f.id===s.f.id)}));
  else solicitadas=filas.filter(f=>f.cantidad_pendiente>0).map(f=>({f,cantidad:f.cantidad_pendiente}));
  if(!solicitadas.length)throw error(409,'No hay cantidades pendientes.');
  for(const s of solicitadas)if(s.cantidad>s.f.cantidad_pendiente)throw error(409,'La recepcion supera la cantidad pendiente.');
  // Los cuerpos nuevos no admiten productos duplicados. Rechazar legado ambiguo.
  if(new Set(filas.map(f=>f.productos_id.toLowerCase())).size!==filas.length)throw error(409,'Compra con productos duplicados; requiere conciliacion.');
  const productos=await productosBloqueados(c,solicitadas.map(s=>s.f.productos_id)),fecha=await hora(c),recepcionId=randomUUID();
  filaEscrita((await c.query("INSERT INTO recepciones_compra (id,compras_id,estado,recibida_por,recibida_en,clave_idempotencia) VALUES (?,?,'confirmada',?,?,?)",[recepcionId,compra.id,actor,fecha,key??null]))[0]);
  for(const s of solicitadas){
    const p=productos.get(s.f.productos_id),calc=calcularCPP(p.cantidad_disponible,p.cpp,s.cantidad,s.f.precio_unitario);
    const version=await actualizarProducto(c,p,calc.stock,calc.cpp),mov=await movimiento(c,actor,compra,p,s.cantidad,calc.stock,fecha);
    const l={id:randomUUID(),precio_unitario:s.f.precio_unitario};
    filaEscrita((await c.query('INSERT INTO recepcion_compra_items (id,recepciones_compra_id,compra_items_id,productos_id,cantidad_recibida,precio_unitario,movimiento_entrada_id) VALUES (?,?,?,?,?,?,?)',[l.id,recepcionId,s.f.id,p.id,s.cantidad,l.precio_unitario,mov]))[0]);
    await historial(c,actor,compra,l,p,s.cantidad,calc.stock,calc.cpp,version,calc.residuo,fecha,'recepcion');
  }
  const datos=await recalcular(c,compra);
  await registrarAuditoria(c,actor,'compras','compra_recepcion_confirmada','recepciones_compra',recepcionId,{compra_id:compra.id,items:solicitadas.map(s=>({compra_item_id:s.f.id,cantidad:s.cantidad})),estado_compra:datos.estado});
  return {body:{mensaje:'Compra recibida correctamente.',datos,recepcion:await detalleRecepcion(c,compra.id,recepcionId)}};
};
const motivo=body=>{if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).some(k=>k!=='motivo')||typeof body.motivo!=='string'||!body.motivo.trim()||[...body.motivo].length>500)throw error(400,'Envie motivo no vacio de hasta 500 caracteres.');return body.motivo.trim();};
const reversar=async(c,id,recepcionId,body,actor)=>{
  const razon=motivo(body),compra=await bloquear(c,id);
  if(compra.modelo_recepcion!=='v2')throw error(409,'Compra historica sin reverso automatico.');
  if(!idValido(recepcionId))throw error(400,'ID de recepcion invalido.');
  const [[r]]=await c.query('SELECT id,estado FROM recepciones_compra WHERE id=? AND compras_id=? FOR UPDATE',[recepcionId,compra.id]);
  if(!r)throw error(404,'Recepcion no encontrada.');if(r.estado!=='confirmada')throw error(409,'La recepcion ya fue reversada.');
  await items(c,compra,true);
  const [lineas]=await c.query('SELECT * FROM recepcion_compra_items WHERE recepciones_compra_id=? ORDER BY productos_id,id FOR UPDATE',[r.id]);
  if(!lineas.length)throw error(409,'Recepcion sin lineas.');
  const productos=await productosBloqueados(c,lineas.map(l=>l.productos_id));
  const originales=new Map();
  for(const l of lineas){
    const [[h]]=await c.query("SELECT stock_antes,stock_despues,CAST(cpp_antes AS CHAR) AS cpp_antes,CAST(cpp_despues AS CHAR) AS cpp_despues,CAST(version_despues AS CHAR) AS version_despues FROM historial_costos_recepciones WHERE recepcion_compra_items_id=? AND evento='recepcion'",[l.id]);
    const p=productos.get(l.productos_id);
    if(!h||BigInt(p.version)!==BigInt(h.version_despues)||p.cantidad_disponible!==h.stock_despues||centavos(p.cpp)!==centavos(h.cpp_despues)||p.cantidad_disponible-l.cantidad_recibida!==h.stock_antes)throw error(409,'Operaciones posteriores o snapshot inconsistente; requiere conciliacion.');
    originales.set(l.id,h);
  }
  const fecha=await hora(c);
  for(const l of lineas){
    const p=productos.get(l.productos_id),h=originales.get(l.id),version=await actualizarProducto(c,p,h.stock_antes,h.cpp_antes);
    const mov=await movimiento(c,actor,compra,p,-l.cantidad_recibida,h.stock_antes,fecha);
    filaEscrita((await c.query('UPDATE recepcion_compra_items SET movimiento_reverso_id=? WHERE id=? AND movimiento_reverso_id IS NULL',[mov,l.id]))[0]);
    // Diferencia entre valor previo, salida a costo original y valor restaurado.
    const residuo=BigInt(p.cantidad_disponible)*centavos(p.cpp)-BigInt(l.cantidad_recibida)*centavos(l.precio_unitario)-BigInt(h.stock_antes)*centavos(h.cpp_antes);
    await historial(c,actor,compra,l,p,-l.cantidad_recibida,h.stock_antes,h.cpp_antes,version,residuo.toString(),fecha,'reverso');
  }
  filaEscrita((await c.query("UPDATE recepciones_compra SET estado='reversada',reversada_por=?,reversada_en=?,motivo_reverso=? WHERE id=? AND estado='confirmada'",[actor,fecha,razon,r.id]))[0]);
  const datos=await recalcular(c,compra);
  await registrarAuditoria(c,actor,'compras','compra_recepcion_reversada','recepciones_compra',r.id,{compra_id:compra.id,motivo:razon,estado_compra:datos.estado});
  return {body:{mensaje:'Recepcion reversada correctamente.',datos,recepcion:await detalleRecepcion(c,compra.id,r.id)}};
};
const cancelar=async(c,id,actor,body,soloSaldo=false)=>{
  const razon=soloSaldo?motivo(body):null,compra=await bloquear(c,id);
  if(!['pendiente','parcialmente_recibida'].includes(compra.estado))throw error(409,'La compra no admite cancelacion.');
  if(compra.modelo_recepcion==='legado'&&!soloSaldo){
    const [previos]=await c.query("SELECT id FROM movimientos_inventario WHERE referencia_tipo='compra' AND referencia_id=? LIMIT 1",[compra.id]);
    if(centavos(compra.total_recibido)!==0n||previos.length)throw error(409,'Compra legado con recepcion previa; requiere conciliacion.');
    filaEscrita((await c.query("UPDATE compras SET estado='cancelada' WHERE id=? AND estado='pendiente'",[compra.id]))[0]);
  }else{
    await adoptar(c,compra);const filas=await items(c,compra,true);
    if(!soloSaldo&&filas.some(f=>f.cantidad_recibida>0))throw error(409,'Hay mercancia recibida; cancele solo el saldo pendiente.');
    if(!filas.some(f=>f.cantidad_pendiente>0))throw error(409,'No hay saldo pendiente.');
    for(const f of filas)if(f.cantidad_pendiente>0)filaEscrita((await c.query('UPDATE compra_items SET cantidad_cancelada=? WHERE id=?',[f.cantidad_cancelada+f.cantidad_pendiente,f.id]))[0]);
    await recalcular(c,compra);
  }
  await registrarAuditoria(c,actor,'compras',soloSaldo?'compra_saldo_cancelado':'compra_cancelada','compras',compra.id,{antes:{estado:compra.estado},motivo:razon,creador_original:compra.usuarios_id});
  const [[datos]]=await c.query(consultaCompras+' WHERE c.id=?',[compra.id]);return {body:{mensaje:soloSaldo?'Saldo pendiente cancelado correctamente.':'Compra cancelada correctamente.',datos}};
};
const listarRecepciones=async(c,id,q)=>{
  if(!idValido(id))throw error(400,'ID invalido.');
  const [[compra]]=await c.query('SELECT id FROM compras WHERE id=?',[id]);if(!compra)throw error(404,'Compra no encontrada.');
  if(Object.keys(q).some(k=>!['pagina','limite'].includes(k)))throw error(400,'Filtros invalidos.');
  const entero=(v,d)=>v===undefined?d:typeof v==='string'&&/^[1-9]\d*$/.test(v)?Number(v):NaN;
  const pagina=entero(q.pagina,1),limite=entero(q.limite,20),offset=(pagina-1)*limite;
  if(!Number.isSafeInteger(pagina)||!Number.isSafeInteger(limite)||limite>100||!Number.isSafeInteger(offset))throw error(400,'Paginacion invalida.');
  const [[r]]=await c.query('SELECT COUNT(*) AS total FROM recepciones_compra WHERE compras_id=?',[compra.id]);
  const [ids]=await c.query('SELECT id FROM recepciones_compra WHERE compras_id=? ORDER BY recibida_en DESC,id DESC LIMIT ? OFFSET ?',[compra.id,limite,offset]);
  const datos=[];for(const r of ids)datos.push(await detalleRecepcion(c,compra.id,r.id));
  return {body:{mensaje:'Recepciones consultadas correctamente.',datos,paginacion:{pagina,limite,total:r.total,total_paginas:Math.ceil(r.total/limite)}}};
};
module.exports={recibir,reversar,cancelar,items,detalleRecepcion,listarRecepciones,calcularCPP};
