const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {crear,ejecutarSQL}=require('./helpers/comprasSandbox');
test('Juegos por pedido: migracion, historicos, cobro, comprobantes, traslado y divisiones',{skip:process.env.RUN_MYSQL_JUEGOS_PEDIDO_TESTS!=='1'},async t=>{
 const sandbox=await crear(),c=sandbox.connection;
 const cache=new Map();let fallo=null,n=0;
 function load(file){
  const full=path.resolve(__dirname,'../src',file);if(cache.has(full))return cache.get(full);
  const m={exports:{}};cache.set(full,m.exports);
  vm.runInNewContext(fs.readFileSync(full,'utf8'),{module:m,exports:m.exports,console:{error(){},log(){}},require:name=>{
   if(name==='mysql2')return {createConnection:()=>({promise:()=>{
    const db=require('mysql2/promise').createConnection(sandbox.config);
    return {beginTransaction:async()=> (await db).beginTransaction(),commit:async()=> (await db).commit(),rollback:async()=> (await db).rollback(),end:async()=> (await db).end(),
     query:async(sql,args)=>{if(fallo&&sql.includes(fallo))throw new Error('Fallo inyectado');return (await db).query(sql,args);}};
   }})};
   if(name.endsWith('/config/db'))return {dbConfig:sandbox.config,query:(sql,args,cb)=>{if(typeof args==='function'){cb=args;args=[];}c.query(sql,args).then(([r])=>cb(null,r),cb);}};
   if(name.startsWith('.'))return load(path.resolve(path.dirname(full),name+'.js'));
   return require(name);
  }});cache.set(full,m.exports);return m.exports;
 }
 const call=async(fn,body={},params={},query={})=>{let r;await fn({body,params,query,usuario:{id:'u',rol:'Administrador'},get:()=> 'clave-juegos-1'},{status(s){this.s=s;return this;},json(data){r={status:this.s||200,data:JSON.parse(JSON.stringify(data))};}});return r;};
 const juegos=load('controllers/juegosController.js'),cuotas=load('controllers/divisionesController.js');
 const liquidacion=require('../src/services/liquidacionService');
 async function nueva(){
  const id=++n,mesa='m'+id,pedido='p'+id,activo='a'+id;
  await c.query("INSERT INTO mesas(id,numero,estado) VALUES (?,?,'disponible')",[mesa,id]);
  await c.query("INSERT INTO pedidos(id,estado,creado_en,mesas_id,usuarios_id,clientes_id) VALUES (?,'abierto',NOW(),?,'u','cl')",[pedido,mesa]);
  await c.query("INSERT INTO sesiones_mesa(id,mesas_id,estado,iniciada_en) VALUES (?,?,'activa',NOW())",['v'+id,mesa]);
  await c.query('UPDATE pedidos SET sesion_mesa_id=? WHERE id=?',['v'+id,pedido]);
  await c.query("INSERT INTO activos_juego(id,nombre,estado,tipo,precio_hora) VALUES (?,?,'disponible','billar',3600)",[activo,'Billar '+id]);
  return {mesas_id:mesa,pedidos_id:pedido,activos_juego_id:activo};
 }
 const cuenta=async b=>{await c.beginTransaction();try{return await liquidacion.calcularCuenta(c,{id:b.pedidos_id});}finally{await c.rollback();}};
 try{
  await ejecutarSQL(c,'v2.43_sesiones_juego_pedido_directo.sql');
  await c.query("INSERT INTO usuarios(id,nombre,email,password_hash,estado,roles_id) VALUES ('u','Actor','game@example.invalid','x','activo',1)");
  await c.query("INSERT INTO clientes(id,nombre,estado,usuarios_id) VALUES ('cl','Cliente','activo','u')");
  await c.query("INSERT INTO productos(id,nombre,codigo,precio_venta,costo_promedio_ponderado,cantidad_disponible,stock_minimo,estado,categorias_id,proveedores_id,historial_costos_id) VALUES ('pr','Producto','PR',10,0,100,1,'activo',1,'prov',NULL)");
  await t.test('inicio directo sin productos; activo bloquea liquidacion y stock intacto',async()=>{
   const b=await nueva(),before=(await c.query("SELECT cantidad_disponible FROM productos WHERE id='pr'"))[0][0];
   const r=await call(juegos.iniciarJuego,b);assert.equal(r.status,201,JSON.stringify(r));assert.equal(r.data.datos.pedidos_id,b.pedidos_id);assert.equal(r.data.datos.pedido_items_id,null);
   const q=await cuenta(b);assert.equal(q.total,0n);assert.equal(q.totalDefinitivo,false);
   assert.deepEqual((await c.query("SELECT cantidad_disponible FROM productos WHERE id='pr'"))[0][0],before);
   assert.equal((await c.query('SELECT COUNT(*) n FROM pedido_items'))[0][0].n,0);assert.equal((await c.query('SELECT COUNT(*) n FROM movimientos_inventario'))[0][0].n,0);
   assert.equal((await call(juegos.iniciarJuego,b)).status,409);
  });
  await t.test('cerrado, otra mesa, visita cerrada, inexistente y rollback',async()=>{
   const b=await nueva();await c.query("UPDATE pedidos SET estado='cerrado' WHERE id=?",[b.pedidos_id]);assert.equal((await call(juegos.iniciarJuego,b)).status,409);
   await c.query("UPDATE pedidos SET estado='abierto' WHERE id=?",[b.pedidos_id]);const otro=await nueva();assert.equal((await call(juegos.iniciarJuego,{...b,mesas_id:otro.mesas_id})).status,409);
   assert.equal((await call(juegos.iniciarJuego,{...b,pedidos_id:'inexistente'})).status,404);
   await c.query("INSERT INTO sesiones_mesa(id,mesas_id,estado,iniciada_en,cerrada_en) VALUES ('cerrada',?,'cerrada',NOW(),NOW())",[b.mesas_id]);await c.query("UPDATE pedidos SET sesion_mesa_id='cerrada' WHERE id=?",[b.pedidos_id]);assert.equal((await call(juegos.iniciarJuego,b)).status,409);
   await c.query('UPDATE pedidos SET sesion_mesa_id=NULL WHERE id=?',[b.pedidos_id]);fallo='UPDATE activos_juego';assert.equal((await call(juegos.iniciarJuego,b)).status,500);fallo=null;
   assert.equal((await c.query('SELECT COUNT(*) n FROM sesiones_juego WHERE pedidos_id=?',[b.pedidos_id]))[0][0].n,0);assert.equal((await c.query('SELECT estado FROM mesas WHERE id=?',[b.mesas_id]))[0][0].estado,'disponible');
  });
  await t.test('finalizar cobra una vez, cuenta visible concuerda, comprobante y no inventario',async()=>{
   const b=await nueva(),r=await call(juegos.iniciarJuego,b);assert.equal(r.status,201);
   await c.query('UPDATE sesiones_juego SET fecha_inicio=UTC_TIMESTAMP()-INTERVAL 60 SECOND WHERE id=?',[r.data.id_sesion]);
   const fin=await call(juegos.terminarJuego,{}, {id:r.data.id_sesion});assert.equal(fin.status,200,JSON.stringify(fin));const q=await cuenta(b);assert.equal(q.totalDefinitivo,true);assert.equal(q.juegos,liquidacion.centavos(fin.data.total_cobrado));
   const account=load('controllers/pedidosController.js');const visible=await new Promise(resolve=>account.obtenerCuentaConsolidada({params:{mesa_id:b.mesas_id}},{status(s){this.s=s;return this;},json(data){resolve({status:this.s||200,data});}}));assert.equal(visible.status,200);assert.equal(visible.data.data.detalle_juegos.length,1);assert.equal(liquidacion.centavos(visible.data.data.resumen.total_general),q.total);assert.ok(visible.data.data.detalle_juegos[0].fecha_fin);
   await c.query("INSERT INTO pagos(id,metodo_de_pago,total_seleccionado,estado,verificacion_estado,creado_en,pedidos_id,usuarios_id) VALUES (?,'efectivo',?,'pagado','verificado',NOW(),?,'u')",['pago-'+n,fin.data.total_cobrado,b.pedidos_id]);await c.query("UPDATE pedidos SET estado='cerrado' WHERE id=?",[b.pedidos_id]);
   const receipt=await call(load('controllers/ventasController.js').generarFactura,{pedido_id:b.pedidos_id});assert.equal(receipt.status,201,JSON.stringify(receipt));assert.equal(receipt.data.comprobante.items.length,1);assert.equal(receipt.data.comprobante.items[0].tipo,'juego');assert.equal(receipt.data.comprobante.total_general,fin.data.total_cobrado);
   assert.equal((await c.query('SELECT COUNT(*) n FROM pedido_items'))[0][0].n,0);assert.equal((await c.query('SELECT COUNT(*) n FROM movimientos_inventario'))[0][0].n,0);
  });
  await t.test('backfill inequívoco, ambiguo sin inferencia, cancelado excluido, ambas referencias una vez',async()=>{
   const b=await nueva();
   for(const [id,estado,parent]of [['h','servido',b.pedidos_id],['hc','cancelado',b.pedidos_id],['ha','servido','otro']]){
    await c.query("INSERT INTO pedido_items(id,precio_unitario,pedido_id,producto_id,cantidad_pedida,cantidad_pagada,estado,pedidos_id,productos_id) VALUES (?,0,?,'pr',1,0,?,?,'pr')",[id,parent,estado,b.pedidos_id]);
    await c.query("INSERT INTO sesiones_juego(id,tipo_juego,estado,costo_total,activos_juego_id,mesas_id,iniciada_por,pedido_items_id) VALUES (?,'billar','cerrada',10,?,?,'u',?)",['s'+id,b.activos_juego_id,b.mesas_id,id]);
   }
   await ejecutarSQL(c,'v2.43_sesiones_juego_pedido_directo.sql');await ejecutarSQL(c,'v2.43_sesiones_juego_pedido_directo.sql');
   const [rows]=await c.query("SELECT id,pedidos_id FROM sesiones_juego WHERE id IN ('sh','shc','sha') ORDER BY id");assert.equal(rows.find(x=>x.id==='sh').pedidos_id,b.pedidos_id);assert.equal(rows.find(x=>x.id==='shc').pedidos_id,b.pedidos_id);assert.equal(rows.find(x=>x.id==='sha').pedidos_id,null);
   await c.query("DELETE FROM sesiones_juego WHERE id='sha'");await c.query("DELETE FROM pedido_items WHERE id='ha'");
   const q=await cuenta(b);assert.equal(q.juegos,1000n);
  });
  await t.test('traslado de juego cerrado directo y divisiones monetarias sin producto ficticio',async()=>{
   const b=await nueva(),destino=await nueva();await c.query('DELETE FROM pedidos WHERE id=?',[destino.pedidos_id]);
   await c.query('DELETE FROM sesiones_mesa WHERE mesas_id=?',[destino.mesas_id]);
   const r=await call(juegos.iniciarJuego,b);await c.query('UPDATE sesiones_juego SET fecha_inicio=UTC_TIMESTAMP()-INTERVAL 60 SECOND WHERE id=?',[r.data.id_sesion]);const fin=await call(juegos.terminarJuego,{}, {id:r.data.id_sesion});assert.equal(fin.status,200);
   const transfer=await call(load('controllers/mesasController.js').trasladarMesa,{mesa_origen_id:b.mesas_id,mesa_destino_id:destino.mesas_id});assert.equal(transfer.status,200,JSON.stringify(transfer));assert.equal((await c.query('SELECT mesas_id,pedidos_id FROM sesiones_juego WHERE id=?',[r.data.id_sesion]))[0][0].mesas_id,destino.mesas_id);
   const [[p]]=await c.query('SELECT sesion_mesa_id FROM pedidos WHERE id=?',[b.pedidos_id]);await c.query("INSERT INTO jugadores(id,nombre,mesas_id,tipo_participante,sesion_mesa_id) VALUES ('persona','Carlos',?,'temporal',?)",[destino.mesas_id,p.sesion_mesa_id]);
   const d=await call(cuotas.iniciarSesionDivision,{mesas_id:destino.mesas_id,modalidad:'total'});const assigned=await call(cuotas.definirCuotas,{pedido_id:b.pedidos_id,jugadores_id:'persona'},{id:d.data.data.id});assert.equal(assigned.status,201,JSON.stringify(assigned));assert.equal(assigned.data.data.total_objetivo,fin.data.total_cobrado);
   const ctx=await call(load('controllers/divisionContextoController.js').obtener,{}, {pedido_id:b.pedidos_id});assert.deepEqual(ctx.data.datos.items,[]);
   const extra=await nueva();
   const segundo=await call(juegos.iniciarJuego,{...b,mesas_id:destino.mesas_id,activos_juego_id:extra.activos_juego_id});assert.equal(segundo.status,201);
   await c.query('UPDATE sesiones_juego SET fecha_inicio=UTC_TIMESTAMP()-INTERVAL 60 SECOND WHERE id=?',[segundo.data.id_sesion]);assert.equal((await call(juegos.terminarJuego,{}, {id:segundo.data.id_sesion})).status,200);
   const changed=await call(cuotas.obtenerResumenDivision,{}, {id:d.data.data.id});assert.equal(changed.data.data.desactualizada,true);
  });
 }finally{await sandbox.close();}
});
