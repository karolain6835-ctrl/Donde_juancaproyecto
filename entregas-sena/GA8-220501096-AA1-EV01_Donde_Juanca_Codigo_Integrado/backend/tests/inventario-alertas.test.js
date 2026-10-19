const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const mysql=require('mysql2/promise');
const {crear,ejecutarSQL}=require('./helpers/comprasSandbox');
test('Alertas Fase 2: episodios, acciones e integraciones en MariaDB desechable',{skip:process.env.RUN_MYSQL_ALERTAS_TESTS!=='1'},async t=>{
 const sandbox=await crear({alertas:true}),c=sandbox.connection;let fallo=null;
 const proxy={query:async(sql,p)=>{if(fallo&&sql.includes(fallo))throw new Error('Fallo inyectado');return c.query(sql,p);},beginTransaction:()=>c.beginTransaction(),commit:()=>c.commit(),rollback:()=>c.rollback(),end:async()=>{}};
 const cache=new Map();const load=file=>{file=path.resolve(__dirname,'../src',file);if(cache.has(file))return cache.get(file);const m={exports:{}};
  vm.runInNewContext(fs.readFileSync(file,'utf8'),{module:m,exports:m.exports,console:{error(){},log(){}},require:n=>{
   if(n==='mysql2')return {createConnection:()=>({promise:()=>proxy})};
   if(n==='../config/db')return {dbConfig:{},query:(sql,p,cb)=>c.query(sql,p).then(([r])=>cb(null,r),cb)};
   if(n.startsWith('.'))return load(path.resolve(path.dirname(file),n+'.js'));return require(n);
  }});cache.set(file,m.exports);return m.exports;};
 const servicio=load('services/alertasInventarioService.js'),controller=load('controllers/alertasInventarioController.js');
 const tx=async(fn,conn=c)=>{await conn.beginTransaction();try{const r=await fn();await conn.commit();return r;}catch(e){await conn.rollback();throw e;}};
 const accion=(id,a,body={})=>tx(()=>servicio.actuar(proxy,id,a,'u2',body));
 const call=async(fn,body={},params={})=>{let r;await fn({body,params,query:{},usuario:{id:'u2'}},{status(s){this.s=s;return this;},json(data){r={status:this.s||200,data};}});return r;};
 const abiertas=async()=>(await c.query("SELECT * FROM alertas_inventario WHERE modelo_episodio='v2' AND estado<>'resuelta' AND productos_id='pr'"))[0];
 const stock=async(q,min=10)=>c.query("UPDATE productos SET cantidad_disponible=?,stock_minimo=? WHERE id='pr'",[q,min]);
 const reset=async()=>{fallo=null;await stock(20);await c.query('DELETE FROM auditoria');await c.query('DELETE FROM alertas_inventario_historial');await c.query('DELETE FROM alertas_inventario');};
 try{
  for(const u of ['u1','u2'])await c.query("INSERT INTO usuarios(id,nombre,email,password_hash,estado,roles_id) VALUES (?,?,?,'fixture','activo',1)",[u,u,u+'@example.invalid']);
  await c.query("INSERT INTO productos(id,nombre,codigo,precio_venta,costo_promedio_ponderado,cantidad_disponible,stock_minimo,estado,categorias_id,proveedores_id,historial_costos_id,stock) VALUES ('pr','Producto','PR',100,10,20,10,'activo',1,'prov','hist',777)");
  await c.query("INSERT INTO mesas(id,numero,estado) VALUES ('m',1,'ocupada')");
  await c.query("INSERT INTO pedidos(id,estado,creado_en,mesas_id,usuarios_id,clientes_id) VALUES ('ped','abierto',UTC_TIMESTAMP(),'m','u1','cl')");
  await c.query("INSERT INTO merma_motivos(id,nombre) VALUES ('mot','Rotura')");await c.query("INSERT INTO refrigeradores(id,nombre,estado) VALUES ('ref','Ref','activa')");
  await t.test('normal, umbral exacto, agotado y cambios dentro del mismo episodio',async()=>{
   await reset();assert.equal((await servicio.listar(c)).total_alertas,0);await stock(10);const [a]=await abiertas();assert.equal(a.tipo,'bajo');
   await stock(0);assert.equal((await abiertas())[0].id,a.id);assert.equal((await abiertas())[0].tipo,'agotado');await stock(5);assert.equal((await abiertas())[0].id,a.id);
   await stock(5);const d=await servicio.detalle(c,a.id);assert.deepEqual(d.historial.map(h=>h.evento),['alerta_creada','cambio_condicion','cambio_condicion']);assert.ok(d.historial.every(h=>h.origen==='automatico'&&h.usuarios_id===null));
   await stock(11);assert.equal((await abiertas()).length,0);assert.equal((await servicio.detalle(c,a.id)).estado,'resuelta');await stock(9);assert.notEqual((await abiertas())[0].id,a.id);
  });
  await t.test('negativos e inactivos conservan reglas; umbral negativo sin normalizar',async()=>{
   await reset();await c.query("UPDATE productos SET estado='inactivo' WHERE id='pr'");await stock(-1);assert.equal((await abiertas())[0].tipo,'agotado');
   await stock(0,-2);assert.equal((await abiertas()).length,0);await stock(-3,-2);assert.equal((await abiertas())[0].tipo,'agotado');await c.query("UPDATE productos SET estado='activo' WHERE id='pr'");
  });
  await t.test('acciones humanas, historial ordenado, actor, auditoria e idempotencia',async()=>{
   await reset();await stock(8);const [a]=await abiertas();await accion(a.id,'vista');await accion(a.id,'vista');await accion(a.id,'silenciar');await stock(0);assert.equal((await abiertas())[0].estado,'silenciada');await accion(a.id,'reactivar');
   const d=await servicio.detalle(c,a.id);assert.equal(d.vista_por,'u2');assert.equal(d.silenciada_por,'u2');assert.equal(d.estado,'activa');assert.equal(d.historial.filter(h=>h.origen==='humano').length,3);assert.ok(d.historial.filter(h=>h.origen==='humano').every(h=>h.usuarios_id==='u2'));
   const [aud]=await c.query('SELECT usuarios_id FROM auditoria');assert.equal(aud.length,3);assert.ok(aud.every(a=>a.usuarios_id==='u2'));
   await assert.rejects(accion(a.id,'resolver'),e=>e.status===409);assert.equal((await accion(a.id,'reactivar')).alerta.estado,'activa');await assert.rejects(accion(a.id,'vista',{usuarios_id:'u1'}),e=>e.status===400);
   assert.equal((await call(controller.accion('vista'),{usuarios_id:'u1'},{id:a.id})).status,400);
   await stock(20);const r=await servicio.detalle(c,a.id);assert.equal(r.resuelta_por,null);assert.ok(r.resuelto_en);assert.equal(r.historial.at(-1).evento,'alerta_resuelta_automaticamente');
  });
  await t.test('resolucion manual solo normal, conserva actor y no duplica',async()=>{
   await reset();await stock(8);const [a]=await abiertas();
   // Simular conciliacion de un escritor antiguo sin trigger, solo en el sandbox.
   await c.query('DROP TRIGGER trg_producto_alerta_update');
   try{await stock(20);await accion(a.id,'resolver');const d=await servicio.detalle(c,a.id);assert.equal(d.resuelta_por,'u2');assert.equal(d.historial.at(-1).evento,'alerta_resuelta_manualmente');}
   finally{await c.query('CREATE TRIGGER trg_producto_alerta_update AFTER UPDATE ON productos FOR EACH ROW CALL sincronizar_alerta_inventario(NEW.id,NEW.cantidad_disponible,NEW.stock_minimo)');}
  });
  await t.test('filtros, fechas, paginacion, legado y contrato sin filtros',async()=>{
   await reset();await stock(9);const [a]=await abiertas();await stock(20);await stock(0);const actual=(await abiertas())[0];
   const r=await servicio.listar(c);assert.equal(r.total_alertas,1);assert.equal(r.alertas[0].productos_id,'pr');assert.equal(r.alertas[0].stock_actual,0);assert.equal(r.alertas[0].tipo,'agotado');assert.equal(r.mensaje,'Alertas de inventario consultadas correctamente.');
   assert.equal((await servicio.listar(c,{estado:'resuelta'})).alertas[0].id,a.id);assert.equal((await servicio.listar(c,{producto_id:'pr',tipo:'agotado',estado:'activa'})).alertas[0].id,actual.id);
   assert.equal((await servicio.listar(c,{pagina:'2',limite:'1'})).alertas.length,0);assert.equal((await servicio.listar(c,{fecha_inicio:'2000-01-01T00:00:00',fecha_fin:'2100-01-01T00:00:00'})).total_alertas,1);
   for(const q of [{estado:'otro'},{tipo:'otro'},{producto_id:''},{limite:'101'},{pagina:'0'},{fecha_inicio:'2026-02-30T00:00:00'},{usuarios_id:'u1'}])await assert.rejects(servicio.listar(c,q),e=>e.status===400);
   await c.query("INSERT INTO alertas_inventario(id,tipo,estado,creado_en,productos_id) VALUES ('leg','bajo','activa','2020-01-01','pr')");assert.equal((await servicio.listar(c)).total_alertas,1);
   await assert.rejects(servicio.detalle(c,'inexistente'),e=>e.status===404);
  });
  for(const sql of ['INSERT INTO alertas_inventario_historial','INSERT INTO auditoria'])await t.test('rollback accion por '+sql,async()=>{
   await reset();await stock(8);const [a]=await abiertas();fallo=sql;await assert.rejects(accion(a.id,'vista'));fallo=null;const d=await servicio.detalle(c,a.id);assert.equal(d.estado,'activa');assert.equal(d.historial.length,1);assert.equal((await c.query('SELECT COUNT(*) AS n FROM auditoria'))[0][0].n,0);
  });
  await t.test('rollback de stock si el historial automatico falla',async()=>{
   await reset();await c.query("CREATE TRIGGER trg_fallo_historial BEFORE INSERT ON alertas_inventario_historial FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Fallo historial'");
   try{await assert.rejects(stock(8));assert.equal((await c.query("SELECT cantidad_disponible FROM productos WHERE id='pr'"))[0][0].cantidad_disponible,20);assert.equal((await abiertas()).length,0);}finally{await c.query('DROP TRIGGER trg_fallo_historial');}
  });
  await t.test('integracion ajuste manual, pedido y cancelacion',async()=>{
   await reset();const inventario=load('controllers/inventarioController.js'),pedidos=load('controllers/pedidosController.js');
   assert.equal((await call(inventario.actualizarStock,{producto_id:'pr',nueva_cantidad:11})).status,200);assert.equal((await abiertas()).length,0);
   const r=await call(pedidos.agregarItemPedido,{productos_id:'pr',cantidad_pedida:2,precio_unitario:100},{id_pedido:'ped'});assert.equal(r.status,201);assert.equal((await abiertas()).length,1);
   assert.equal((await call(pedidos.cancelarItemPedido,{}, {id:r.data.id_item})).status,200);assert.equal((await abiertas()).length,0);
   assert.equal((await call(inventario.actualizarStock,{producto_id:'pr',nueva_cantidad:0})).status,200);assert.equal((await abiertas())[0].tipo,'agotado');
  });
  await t.test('integracion merma',async()=>{
   await reset();await stock(11);const r=await call(load('controllers/mermasController.js').registrarMerma,{productos_id:'pr',cantidad:2,merma_motivos_id:'mot',refrigeradores_id:'ref'});assert.equal(r.status,201);assert.equal((await abiertas())[0].stock_observado,9);
  });
  await t.test('fallo posterior del movimiento revierte stock y alerta de la merma',async()=>{
   await reset();await stock(11);fallo='INSERT INTO movimientos_inventario';
   const r=await call(load('controllers/mermasController.js').registrarMerma,{productos_id:'pr',cantidad:2,merma_motivos_id:'mot',refrigeradores_id:'ref'});fallo=null;
   assert.equal(r.status,500);assert.equal((await abiertas()).length,0);assert.equal((await c.query("SELECT cantidad_disponible FROM productos WHERE id='pr'"))[0][0].cantidad_disponible,11);
  });
  await t.test('integracion compra y reverso',async()=>{
   await reset();await stock(8);const compras=load('services/recepcionesCompraService.js');
   await c.query("INSERT INTO compras(id,estado,total_estimado,total_recibido,creado_en,proveedores_id,usuarios_id,modelo_recepcion) VALUES ('co','pendiente',100,0,UTC_TIMESTAMP(),'prov','u1','v2')");
   await c.query("INSERT INTO compra_items(id,cantidad,precio_unitario,compras_id,productos_id,cantidad_cancelada) VALUES ('ci',5,20,'co','pr',0)");
   const r=await tx(()=>compras.recibir(c,'co',{},'u2'));assert.equal((await abiertas()).length,0);
   await tx(()=>compras.reversar(c,'co',r.body.recepcion.id,{motivo:'Correccion'},'u1'));assert.equal((await abiertas()).length,1);assert.equal((await abiertas())[0].stock_observado,8);
  });
  await t.test('concurrencia real y UNIQUE impiden episodios abiertos duplicados',async()=>{
   await reset();const a=await mysql.createConnection(sandbox.config),b=await mysql.createConnection(sandbox.config);
   try{await Promise.all([a.query("UPDATE productos SET cantidad_disponible=9 WHERE id='pr'"),b.query("UPDATE productos SET cantidad_disponible=8 WHERE id='pr'")]);assert.equal((await abiertas()).length,1);
    await assert.rejects(c.query("INSERT INTO alertas_inventario(id,tipo,estado,creado_en,productos_id,modelo_episodio,stock_observado,stock_minimo,actualizado_en) VALUES (UUID(),'bajo','activa',UTC_TIMESTAMP(),'pr','v2',8,10,UTC_TIMESTAMP())"),e=>e.code==='ER_DUP_ENTRY');
   }finally{await a.end();await b.end();}
  });
  await t.test('creacion de producto y cambio de umbral tambien sincronizan',async()=>{
   await reset();await stock(20,25);assert.equal((await abiertas()).length,1);await stock(20,10);assert.equal((await abiertas()).length,0);
   await c.query("INSERT INTO productos(id,nombre,codigo,precio_venta,costo_promedio_ponderado,cantidad_disponible,stock_minimo,estado,categorias_id,proveedores_id,historial_costos_id) VALUES ('nuevo','Nuevo','NUEVO',100,0,0,10,'activo',1,'prov','hist')");
   assert.equal((await servicio.listar(c,{producto_id:'nuevo'})).total_alertas,1);
  });
 }finally{await sandbox.close();}
});

test('v2.35 observa estado actual sin reinterpretar legado',{skip:process.env.RUN_MYSQL_ALERTAS_TESTS!=='1'},async()=>{
 const sandbox=await crear(),c=sandbox.connection;
 try{
  await c.query("INSERT INTO productos(id,nombre,codigo,precio_venta,costo_promedio_ponderado,cantidad_disponible,stock_minimo,estado,categorias_id,proveedores_id,historial_costos_id) VALUES ('pr','Producto','PR',100,0,5,10,'activo',1,'prov','hist')");
  await c.query("INSERT INTO alertas_inventario(id,tipo,estado,creado_en,productos_id) VALUES ('historica','agotado','silenciada','2020-01-01','pr')");
  await ejecutarSQL(c,'v2.35_alertas_inventario_episodios.sql');
  const [[vieja]]=await c.query("SELECT estado,tipo,modelo_episodio,stock_observado,actualizado_en FROM alertas_inventario WHERE id='historica'");
  assert.equal(vieja.estado,'silenciada');assert.equal(vieja.tipo,'agotado');assert.equal(vieja.modelo_episodio,'legado');assert.equal(vieja.stock_observado,null);assert.equal(vieja.actualizado_en,null);
  const [[nueva]]=await c.query("SELECT tipo,stock_observado,ABS(TIMESTAMPDIFF(SECOND,creado_en,UTC_TIMESTAMP())) AS segundos FROM alertas_inventario WHERE modelo_episodio='v2'");
  assert.equal(nueva.tipo,'bajo');assert.equal(nueva.stock_observado,5);assert.ok(nueva.segundos<10);assert.equal((await c.query('SELECT COUNT(*) AS n FROM alertas_inventario_historial'))[0][0].n,1);
 }finally{await sandbox.close();}
});
