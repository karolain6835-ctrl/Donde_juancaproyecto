const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {crear,ejecutarSQL}=require('./helpers/comprasSandbox');
test('Rondas reales: atomicidad, idempotencia, separación, repetición y concurrencia',{skip:process.env.RUN_MYSQL_RONDAS_TESTS!=='1'},async t=>{
 const sandbox=await crear(),c=sandbox.connection;let fail=false,writes=0;
 const load=file=>{const m={exports:{}};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../src/controllers',file),'utf8'),{module:m,exports:m.exports,console:{error(){}},require:n=>{
  if(n==='../config/db')return {dbConfig:sandbox.config,query:(sql,args,cb)=>{if(typeof args==='function'){cb=args;args=[];}c.query(sql,args).then(([r])=>cb(null,r),cb);}};
  if(n==='mysql2')return {createConnection(config){const real=require('mysql2').createConnection(config).promise();return {promise:()=>({beginTransaction:()=>real.beginTransaction(),commit:()=>real.commit(),rollback:()=>real.rollback(),end:()=>real.end(),query(sql,args){if(fail&&sql.includes('INSERT INTO movimientos_inventario')&&++writes===2)throw new Error('Fallo segundo movimiento');return real.query(sql,args);}})};}};
  return require(n.startsWith('.')?path.join(__dirname,'../src/controllers',n):n);
 }});return m.exports;};
 const rounds=load('rondasConsumoController.js'),orders=load('pedidosController.js');
 const call=(fn,body={},params={},key='clave-0001')=>new Promise((resolve,reject)=>Promise.resolve(fn({body,params,usuario:{id:'u',rol:'Administrador'},get:()=>key},{status(s){this.s=s;return this;},json(data){resolve({status:this.s||200,data});}})).catch(reject));
 const line=(person='a',producto='pr',cantidad=1)=>({participante_id:person,productos_id:producto,cantidad});
 const body={items:[line('a','pr',2),line('a','pr',1),line('b','pr',1),line('a','otro',1)]};
 const post=(value=body,key='clave-0001',pedido='p')=>call(rounds.confirmar,value,{pedido_id:pedido},key);
 const snapshot=async()=>JSON.stringify(await Promise.all(['pedido_items','movimientos_inventario','rondas_consumo','productos'].map(async table=>(await c.query('SELECT * FROM '+table+' ORDER BY id'))[0])));
 let first;
 try{
  await c.query("INSERT INTO usuarios(id,nombre,email,password_hash,estado,roles_id) VALUES ('u','Actor','u@example.invalid','fixture','activo',1)");
  await c.query("INSERT INTO mesas(id,numero,estado,creado_en) VALUES ('m',1,'ocupada',NOW()),('m2',2,'ocupada',NOW())");
  await c.query("INSERT INTO sesiones_mesa(id,mesas_id,estado,iniciada_en) VALUES ('s','m','activa',NOW()),('s2','m2','activa',NOW())");
  await c.query("INSERT INTO pedidos(id,estado,creado_en,mesas_id,usuarios_id,clientes_id,sesion_mesa_id) VALUES ('p','abierto',NOW(),'m','u',NULL,'s'),('p2','abierto',NOW(),'m2','u',NULL,'s2')");
  for(const [id,s,mesa] of [['a','s','m'],['b','s','m'],['externo','s2','m2']])await c.query("INSERT INTO jugadores(id,nombre,mesas_id,tipo_participante,sesion_mesa_id) VALUES (?,?,?,'temporal',?)",[id,id,mesa,s]);
  for(const id of ['pr','otro'])await c.query("INSERT INTO productos(id,nombre,codigo,precio_venta,costo_promedio_ponderado,cantidad_disponible,stock_minimo,estado,categorias_id,proveedores_id,historial_costos_id) VALUES (?,?,?,100,0,100,1,'activo',1,'prov','hist')",[id,id,id]);
  await t.test('Ronda 1: varios participantes/productos, consolida solo dentro de la ronda',async()=>{
   const r=await post();assert.equal(r.status,201,JSON.stringify(r));first=r.data.datos;
   assert.equal(first.numero_ronda,1);assert.equal(first.items.length,3);assert.ok(first.items.every(i=>i.estado==='enviado'));
   assert.equal(first.items.find(i=>i.participante_id==='a'&&i.productos_id==='pr').cantidad_pedida,3);
   assert.equal((await c.query("SELECT cantidad_disponible FROM productos WHERE id='pr'"))[0][0].cantidad_disponible,96);
   assert.ok((await c.query('SELECT cantidad_pagada FROM pedido_items'))[0].every(i=>i.cantidad_pagada===0));
  });
  await t.test('mismo reintento devuelve misma ronda sin ítems, stock ni movimientos extra',async()=>{
   const before=await snapshot(),r=await post();assert.equal(r.status,200);assert.equal(r.data.datos.id,first.id);assert.equal(await snapshot(),before);
   assert.equal((await post({...body,items:[line()]},'clave-0001')).status,409);assert.equal(await snapshot(),before);
  });
  await t.test('Ronda 2 y alta ordinaria no consolidan con líneas de otra ronda',async()=>{
   const r=await post({items:[line()]},'clave-0002');assert.equal(r.status,201);assert.equal(r.data.datos.numero_ronda,2);
   assert.notEqual(r.data.datos.items[0].id,first.items.find(i=>i.participante_id==='a'&&i.productos_id==='pr').id);
   const normal=await call(orders.agregarItemPedido,{productos_id:'pr',participante_id:'a',cantidad_pedida:1,precio_unitario:100},{id_pedido:'p'});assert.equal(normal.status,201);
   assert.equal((await c.query('SELECT ronda_consumo_id FROM pedido_items WHERE id=?',[normal.data.id_item]))[0][0].ronda_consumo_id,null);
  });
  await t.test('numeración concurrente es consecutiva; mismo key concurrente descuenta una vez',async()=>{
   const results=await Promise.all([post({items:[line()]},'concurrente-1'),post({items:[line()]},'concurrente-2')]);
   assert.ok(results.every(r=>r.status===201));assert.deepEqual(results.map(r=>r.data.datos.numero_ronda).sort(),[3,4]);
   const before=(await c.query("SELECT cantidad_disponible AS n FROM productos WHERE id='pr'"))[0][0].n;
   const same=await Promise.all([post({items:[line()]},'mismo-key-1'),post({items:[line()]},'mismo-key-1')]);
   assert.deepEqual(same.map(r=>r.status).sort(),[200,201]);assert.equal(same[0].data.datos.id,same[1].data.datos.id);
   assert.equal((await c.query("SELECT cantidad_disponible AS n FROM productos WHERE id='pr'"))[0][0].n,before-1);
  });
  await t.test('rollback de toda la ronda por stock o fallo de segundo movimiento',async()=>{
   const before=await snapshot();assert.equal((await post({items:[line(),line('b','otro',1000)]},'stock-error')).status,400);assert.equal(await snapshot(),before);
   fail=true;writes=0;assert.equal((await post({items:[line(),line('b','otro')]},'fallo-movimiento')).status,500);fail=false;assert.equal(await snapshot(),before);
  });
  await t.test('validaciones de ámbito/activo/cantidad/clave y ausencia de precio manual',async()=>{
   const before=await snapshot();
   for(const [value,key,status,s] of [[{items:[line('a')]},'otra-cuenta',409,'p2'],[{items:[line('externo')]},'otra-persona',409,'p'],[{items:[line('a','pr',0)]},'cantidad-cero',400,'p'],[{items:[{...line(),precio_unitario:1}]},'precio-manual',400,'p'],[body,'',400,'p'],[body,'sin-visita',404,'no-existe']])assert.equal((await post(value,key,s)).status,status);
   assert.equal(await snapshot(),before);
   await c.query("UPDATE productos SET estado='inactivo' WHERE id='otro'");assert.equal((await post({items:[line('a','otro')]},'inactivo-1')).status,409);await c.query("UPDATE productos SET estado='activo' WHERE id='otro'");
  });
  await t.test('repetir revalida precio y deja ronda original intacta; lecturas/cuotas incluyen todas',async()=>{
   const original=JSON.stringify((await call(rounds.obtener,{}, {pedido_id:'p',ronda_id:first.id})).data.datos);
   await c.query("UPDATE productos SET precio_venta=120 WHERE id='pr'");
   const r=await post({items:[line('a','pr',2)]},'copia-editada');assert.equal(r.status,201);assert.equal(Number(r.data.datos.items[0].precio_unitario),120);
   assert.equal(JSON.stringify((await call(rounds.obtener,{}, {pedido_id:'p',ronda_id:first.id})).data.datos),original);
   assert.equal((await call(rounds.listar,{}, {pedido_id:'p'})).data.datos.length,6);
   const detail=await call(orders.obtenerPedidoConDetalles,{}, {id:'p'});
   assert.equal(detail.status,200);
   assert.ok(detail.data.datos.items.every(i=>typeof i.productos_id==='string'));
   assert.ok(detail.data.datos.items.some(i=>i.ronda_consumo_id===first.id));
   assert.ok(detail.data.datos.items.some(i=>i.ronda_consumo_id===null));
   const visitas=load('sesionesMesaController.js');const consumed=await call(visitas.consumos,{}, {sesion_id:'s',participante_id:'a'});assert.equal(consumed.status,200);assert.equal(consumed.data.datos.total_consumido,'1140.00');
   const cuenta=await call(orders.obtenerCuentaConsolidada,{}, {mesa_id:'m'});assert.equal(cuenta.data.data.resumen.total_general,'1240.00');
   const board=await call(load('kanbanController.js').obtenerPedidosAgrupados);assert.equal(board.data.datos.length,1);assert.equal(board.data.datos[0].pedido_id,'p');
  });
  await t.test('otro pedido en la misma visita empieza en 1 y no comparte rondas ni claves',async()=>{
   await c.query("INSERT INTO pedidos(id,estado,creado_en,mesas_id,usuarios_id,clientes_id,sesion_mesa_id) VALUES ('pb','abierto',NOW(),'m','u',NULL,'s')");
   const r=await post(body,'clave-0001','pb');assert.equal(r.status,201);assert.equal(r.data.datos.numero_ronda,1);assert.equal(r.data.datos.pedido_id,'pb');
   assert.ok(r.data.datos.items.every(i=>!first.items.some(original=>original.id===i.id)));
   assert.equal((await call(rounds.obtener,{}, {pedido_id:'pb',ronda_id:first.id})).status,404);
   assert.equal((await call(rounds.listar,{}, {pedido_id:'pb'})).data.datos.length,1);
   assert.equal((await call(rounds.listar,{}, {pedido_id:'p'})).data.datos.length,6);
   const before=await snapshot();assert.equal((await post(body,'clave-0001','pb')).status,200);assert.equal(await snapshot(),before);
   assert.equal((await post({...body,pedido_id:'p'},'body-pedido','pb')).status,400);
   assert.equal((await c.query("SELECT COUNT(*) AS n FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='rondas_consumo' AND COLUMN_NAME='sesion_mesa_id'"))[0][0].n,0);
  });
  await t.test('migración repetible; sesión cerrada rechaza nueva pero conserva reintento confirmado',async()=>{
   await ejecutarSQL(c,'v2.40_rondas_consumo.sql');await ejecutarSQL(c,'v2.40_rondas_consumo.sql');
   await c.query("UPDATE sesiones_mesa SET estado='cerrada',cerrada_en=NOW() WHERE id='s'");
   const before=await snapshot();assert.equal((await post(body,'cerrada-nueva')).status,409);assert.equal((await post()).status,200);assert.equal(await snapshot(),before);
  });
 }finally{await sandbox.close();}
});
