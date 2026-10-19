const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const mysql=require('mysql2/promise');
const {crear}=require('./helpers/comprasSandbox');
const audit=require('../src/services/auditoriaService');
const cargarServicio=(c)=>{
 const cache=new Map();const load=f=>{
  f=path.resolve(__dirname,'../src',f);if(cache.has(f))return cache.get(f);
  const m={exports:{}};vm.runInNewContext(fs.readFileSync(f,'utf8'),{module:m,exports:m.exports,console:{error(){}},require:n=>{
   if(n==='mysql2')return {createConnection:()=>({promise:()=>c})};
   if(n==='../config/db')return {dbConfig:{}};
   if(n.startsWith('.'))return load(path.resolve(path.dirname(f),n+'.js'));
   return require(n);
  }});cache.set(f,m.exports);return m.exports;
 };return load('services/recepcionesCompraService.js');
};
test('Compras Fase 2: MariaDB desechable, trigger y conexiones independientes',{skip:process.env.RUN_MYSQL_COMPRAS_FASE2_TESTS!=='1'},async t=>{
 const sandbox=await crear(),c=sandbox.connection;let fallo=null;
 const proxy={query:async(sql,p)=>{
  if(fallo&&sql.includes(fallo))throw new Error('Fallo inyectado');return c.query(sql,p);
 }};
 const servicio=cargarServicio(proxy);
 const tx=async(fn,connection=c)=>{await connection.beginTransaction();try{const r=await fn();await connection.commit();return r;}catch(e){await connection.rollback();throw e;}};
 const recibir=(id,body,key,actor='u2')=>tx(()=>servicio.recibir(proxy,id,body,actor,key));
 const reversar=(id,r,actor='u1')=>tx(()=>servicio.reversar(proxy,id,r,{motivo:'Correccion de entrega'},actor));
 const reset=async(q=10,cpp='10.00')=>{
  fallo=null;
  for(const table of ['historial_costos_recepciones','recepcion_compra_items','recepciones_compra','auditoria','movimientos_inventario','compra_items','compras'])await c.query('DELETE FROM '+table);
  await c.query('UPDATE productos SET cantidad_disponible=?,costo_promedio_ponderado=?',[q,cpp]);
  await c.query("INSERT INTO compras(id,estado,total_estimado,total_recibido,creado_en,proveedores_id,usuarios_id,modelo_recepcion) VALUES ('co','pendiente',400,0,UTC_TIMESTAMP(),'prov','u1','v2')");
  await c.query("INSERT INTO compra_items(id,cantidad,precio_unitario,compras_id,productos_id,cantidad_cancelada) VALUES ('ci',20,20,'co','pr',0)");
 };
 const body=n=>({items:[{compra_item_id:'ci',cantidad_recibida:n}]});
 const estado=async()=>{
  const [[p]]=await c.query("SELECT cantidad_disponible,CAST(costo_promedio_ponderado AS CHAR) AS cpp,CAST(version_inventario AS CHAR) AS version,stock FROM productos WHERE id='pr'");
  const [[co]]=await c.query("SELECT estado,CAST(total_recibido AS CHAR) AS total_recibido,usuarios_id,modelo_recepcion FROM compras WHERE id='co'");
  const counts={};for(const table of ['recepciones_compra','recepcion_compra_items','historial_costos_recepciones','movimientos_inventario','auditoria'])counts[table]=(await c.query('SELECT COUNT(*) AS n FROM '+table))[0][0].n;
  return {p,co,counts};
 };
 try{
  for(const u of ['u1','u2'])await c.query("INSERT INTO usuarios(id,nombre,email,password_hash,estado,roles_id) VALUES (?,?,?,'fixture','activo',1)",[u,u,u+'@example.invalid']);
  await c.query("INSERT INTO proveedores(id,contacto_nombre,estado) VALUES ('prov','Proveedor','activo')");
  await c.query("INSERT INTO productos(id,nombre,codigo,precio_venta,costo_promedio_ponderado,cantidad_disponible,stock_minimo,estado,categorias_id,proveedores_id,historial_costos_id,stock) VALUES ('pr','Producto','PR',100,10,10,1,'activo',1,'prov','hist',777),('pr2','Producto2','PR2',100,10,10,1,'activo',1,'prov','hist',777)");
  await t.test('parcial 8 + 12, detalle, actor, movimiento y precio congelado',async()=>{
   await reset();const r=await recibir('co',body(8),'primera');assert.equal(r.body.datos.estado,'parcialmente_recibida');
   const st=await estado();assert.equal(st.p.cantidad_disponible,18);assert.equal(st.p.cpp,'14.44');assert.equal(st.p.stock,777);assert.equal(st.co.usuarios_id,'u1');
   const l=r.body.recepcion.items[0],h=l.historial[0];assert.equal(h.usuarios_id,'u2');assert.equal(h.cpp_antes,'10.00');assert.equal(h.cpp_despues,'14.44');assert.equal(h.residuo_redondeo_centavos,'8');
   assert.equal(h.stock_antes,10);assert.equal(h.stock_despues,18);assert.equal(BigInt(h.version_despues),BigInt(h.version_antes)+1n);
   const [[mov]]=await c.query('SELECT tipo,cantidad,usuarios_id,referencia_id FROM movimientos_inventario WHERE id=?',[l.movimiento_entrada_id]);assert.equal(mov.tipo,'compra');assert.equal(mov.cantidad,8);assert.equal(mov.usuarios_id,'u2');assert.equal(mov.referencia_id,'co');
   const [[co]]=await c.query("SELECT * FROM compras WHERE id='co'");const [i]=await servicio.items(c,co);assert.equal(i.cantidad_recibida,8);assert.equal(i.cantidad_pendiente,12);assert.equal(i.cantidad_cancelada,0);
   const final=await recibir('co',body(12),'segunda');assert.equal(final.body.datos.estado,'recibida');assert.equal(final.body.datos.total_recibido,'400.00');assert.equal((await estado()).p.cantidad_disponible,30);
  });
  await t.test('CPP stock cero, precio cero, mitad arriba y limites',async()=>{
   assert.deepEqual(JSON.parse(JSON.stringify(servicio.calcularCPP(1,'0.00',1,'0.01'))),{stock:2,cpp:'0.01',residuo:'-1'});
   assert.equal(servicio.calcularCPP(10,'10.00',1,'0.00').cpp,'9.09');
   assert.throws(()=>servicio.calcularCPP(-1,'10',1,'20'),e=>e.status===409);
   await reset(0);await recibir('co',body(8));assert.equal((await estado()).p.cpp,'20.00');
   await reset(0);await c.query("UPDATE compra_items SET precio_unitario=0 WHERE id='ci'");await recibir('co',body(20));assert.equal((await estado()).p.cpp,'0.00');
   await reset(2147483647);await assert.rejects(recibir('co',body(1)),e=>e.status===409);
  });
  await t.test('completa body ausente y {}, consulta recepciones y paginacion',async()=>{
   for(const b of [undefined,{}]){await reset();const r=await recibir('co',b);assert.equal(r.body.datos.estado,'recibida');assert.equal(r.body.recepcion.items[0].cantidad_recibida,20);}
   const r=await servicio.listarRecepciones(c,'co',{pagina:'1',limite:'1'});assert.equal(r.body.paginacion.total,1);assert.equal(r.body.datos.length,1);
   assert.equal((await servicio.listarRecepciones(c,'co',{pagina:'2',limite:'1'})).body.datos.length,0);
   await assert.rejects(servicio.listarRecepciones(c,'co',{limite:'101'}),e=>e.status===400);
   await assert.rejects(servicio.detalleRecepcion(c,'co','inexistente'),e=>e.status===404);
  });
  await t.test('varios productos reciben cantidades distintas',async()=>{
   await reset();await c.query("INSERT INTO compra_items(id,cantidad,precio_unitario,compras_id,productos_id,cantidad_cancelada) VALUES ('ci2',10,5,'co','pr2',0)");
   const r=await recibir('co',{items:[{compra_item_id:'ci',cantidad_recibida:8},{compra_item_id:'ci2',cantidad_recibida:3}]});assert.equal(r.body.recepcion.items.length,2);assert.equal(r.body.datos.total_recibido,'175.00');
   assert.equal((await c.query("SELECT cantidad_disponible FROM productos WHERE id='pr2'"))[0][0].cantidad_disponible,13);
  });
  await t.test('validaciones de cantidades, ajenos, duplicados, campos y sobrerrecepcion',async()=>{
   await reset();const inicial=await estado();
   for(const b of [{items:[]},null,[],{precio:1},{items:[{compra_item_id:'otro',cantidad_recibida:1}]},{items:[...body(1).items,...body(1).items]},{items:[{...body(1).items[0],precio_unitario:1}]}])await assert.rejects(recibir('co',b),e=>e.status===400);
   for(const cantidad of [0,-1,1.5,'8',null,true])await assert.rejects(recibir('co',body(cantidad)),e=>e.status===400);
   await assert.rejects(recibir('co',body(21)),e=>e.status===409);assert.deepEqual(await estado(),inicial);
  });
  await t.test('idempotencia exacta y contenido distinto',async()=>{
   await reset();const r=await recibir('co',body(8),'key');const antes=await estado();
   assert.equal((await recibir('co',body(8),'key')).body.recepcion.id,r.body.recepcion.id);assert.deepEqual(await estado(),antes);
   await assert.rejects(recibir('co',body(9),'key'),e=>e.status===409);assert.deepEqual(await estado(),antes);
   await assert.rejects(recibir('co',{},'key'),e=>e.status===400);
   await recibir('co',body(12),'otra');assert.equal((await recibir('co',body(8),'key')).body.recepcion.id,r.body.recepcion.id);
  });
  await t.test('reverso completo restaura snapshot, actor distinto, doble reverso',async()=>{
   await reset();const antes=await estado(),r=await recibir('co',body(8));
   const revertida=await reversar('co',r.body.recepcion.id);const despues=await estado();
   assert.equal(despues.p.cantidad_disponible,antes.p.cantidad_disponible);assert.equal(despues.p.cpp,antes.p.cpp);assert.equal(despues.co.estado,'pendiente');assert.equal(despues.co.total_recibido,'0.00');
   assert.equal(revertida.body.recepcion.recibida_por,'u2');assert.equal(revertida.body.recepcion.reversada_por,'u1');assert.equal(revertida.body.recepcion.items[0].historial.length,2);
   const [[mov]]=await c.query('SELECT cantidad,usuarios_id FROM movimientos_inventario WHERE id=?',[revertida.body.recepcion.items[0].movimiento_reverso_id]);assert.equal(mov.cantidad,-8);assert.equal(mov.usuarios_id,'u1');
   await assert.rejects(reversar('co',r.body.recepcion.id),e=>e.status===409);assert.deepEqual(await estado(),despues);
  });
  for(const tipo of ['venta','merma','ajuste','cpp','otra recepcion','ABA'])await t.test('reverso bloqueado tras '+tipo,async()=>{
   await reset();const r=await recibir('co',body(8));
   if(tipo==='otra recepcion')await recibir('co',body(1));
   else if(tipo==='cpp')await c.query("UPDATE productos SET costo_promedio_ponderado=1 WHERE id='pr'");
   else {await c.query("UPDATE productos SET cantidad_disponible=cantidad_disponible-1 WHERE id='pr'");if(tipo==='ABA')await c.query("UPDATE productos SET cantidad_disponible=cantidad_disponible+1 WHERE id='pr'");}
   const antes=await estado();await assert.rejects(reversar('co',r.body.recepcion.id),e=>e.status===409);assert.deepEqual(await estado(),antes);
  });
  await t.test('cancelacion pendiente y cancelacion de saldo parcial no retira stock',async()=>{
   await reset();const antes=(await estado()).p;
   const r=await tx(()=>servicio.cancelar(c,'co','u2',{}));assert.equal(r.body.datos.estado,'cancelada');assert.deepEqual((await estado()).p,antes);
   await reset();await recibir('co',body(8));const parcial=await estado();
   await assert.rejects(tx(()=>servicio.cancelar(c,'co','u2',{})),e=>e.status===409);
   const cierre=await tx(()=>servicio.cancelar(c,'co','u2',{motivo:'Saldo no entregado'},true));assert.equal(cierre.body.datos.estado,'cerrada_parcial');assert.equal(cierre.body.datos.total_recibido,'160.00');assert.deepEqual((await estado()).p,parcial.p);
   const [[i]]=await c.query("SELECT cantidad_cancelada FROM compra_items WHERE id='ci'");assert.equal(i.cantidad_cancelada,12);
   await assert.rejects(recibir('co',body(1)),e=>e.status===409);
  });
  await t.test('legado pendiente adoptado; historico recibido/cancelado intacto',async()=>{
   await reset();await c.query("UPDATE compras SET modelo_recepcion='legado' WHERE id='co'");await c.query('UPDATE compra_items SET cantidad_cancelada=NULL');
   await recibir('co',body(8));assert.equal((await estado()).co.modelo_recepcion,'v2');
   for(const estadoLegacy of ['recibida','cancelada']){
    await reset();await c.query("UPDATE compras SET modelo_recepcion='legado',estado=? WHERE id='co'",[estadoLegacy]);await c.query('UPDATE compra_items SET cantidad_cancelada=NULL');
    const [[co]]=await c.query("SELECT * FROM compras WHERE id='co'");assert.equal((await servicio.items(c,co))[0].cantidad_recibida,null);
    const antes=await estado();await assert.rejects(recibir('co',{}),e=>e.status===409);assert.deepEqual(await estado(),antes);
   }
  });
  for(const sql of ['INSERT INTO movimientos_inventario','INSERT INTO historial_costos_recepciones','INSERT INTO auditoria'])await t.test('rollback recepcion y reverso por '+sql,async()=>{
   await reset();const antes=await estado();fallo=sql;await assert.rejects(recibir('co',body(8)));fallo=null;assert.deepEqual(await estado(),antes);
   const r=await recibir('co',body(8)),pre=await estado();fallo=sql;await assert.rejects(reversar('co',r.body.recepcion.id));fallo=null;assert.deepEqual(await estado(),pre);
  });
  await t.test('concurrencia: dos conexiones independientes no sobre-reciben',async()=>{
   await reset();const a=await mysql.createConnection(sandbox.config),b=await mysql.createConnection(sandbox.config);
   try{const sa=cargarServicio(a),sb=cargarServicio(b);
    const r=await Promise.allSettled([tx(()=>sa.recibir(a,'co',body(12),'u1'),a),tx(()=>sb.recibir(b,'co',body(12),'u2'),b)]);
    assert.equal(r.filter(x=>x.status==='fulfilled').length,1);assert.equal(r.find(x=>x.status==='rejected').reason.status,409);assert.equal((await estado()).p.cantidad_disponible,22);
   }finally{await a.end();await b.end();}
  });
  await t.test('concurrencia: misma key produce una sola recepcion',async()=>{
   await reset();const a=await mysql.createConnection(sandbox.config),b=await mysql.createConnection(sandbox.config);
   try{const sa=cargarServicio(a),sb=cargarServicio(b);
    const [r1,r2]=await Promise.all([tx(()=>sa.recibir(a,'co',body(8),'u1','misma'),a),tx(()=>sb.recibir(b,'co',body(8),'u2','misma'),b)]);
    assert.equal(r1.body.recepcion.id,r2.body.recepcion.id);assert.equal((await estado()).counts.recepciones_compra,1);
   }finally{await a.end();await b.end();}
  });
  await t.test('concurrencia: compras distintas serializan CPP del mismo producto',async()=>{
   await reset();
   await c.query("INSERT INTO compras(id,estado,total_estimado,total_recibido,creado_en,proveedores_id,usuarios_id,modelo_recepcion) VALUES ('co2','pendiente',600,0,UTC_TIMESTAMP(),'prov','u1','v2')");
   await c.query("INSERT INTO compra_items(id,cantidad,precio_unitario,compras_id,productos_id,cantidad_cancelada) VALUES ('ci2',20,30,'co2','pr',0)");
   const a=await mysql.createConnection(sandbox.config),b=await mysql.createConnection(sandbox.config);
   try{const sa=cargarServicio(a),sb=cargarServicio(b);
    await Promise.all([tx(()=>sa.recibir(a,'co',body(20),'u1'),a),tx(()=>sb.recibir(b,'co2',{items:[{compra_item_id:'ci2',cantidad_recibida:20}]},'u2'),b)]);
    assert.equal((await estado()).p.cantidad_disponible,50);
    const [h]=await c.query("SELECT stock_antes,stock_despues,CAST(cpp_antes AS CHAR) AS cpp_antes,CAST(cpp_despues AS CHAR) AS cpp_despues,CAST(version_antes AS CHAR) AS va,CAST(version_despues AS CHAR) AS vd FROM historial_costos_recepciones ORDER BY version_antes");
    assert.equal(h.length,2);assert.equal(h[0].stock_despues,h[1].stock_antes);assert.equal(h[0].cpp_despues,h[1].cpp_antes);assert.equal(h[0].vd,h[1].va);assert.equal(h[1].cpp_despues,(await estado()).p.cpp);
   }finally{await a.end();await b.end();}
  });
  await t.test('concurrencia: doble reverso confirma solo uno',async()=>{
   await reset();const r=await recibir('co',body(8));const a=await mysql.createConnection(sandbox.config),b=await mysql.createConnection(sandbox.config);
   try{const sa=cargarServicio(a),sb=cargarServicio(b),motivo={motivo:'Correccion'};
    const resultados=await Promise.allSettled([tx(()=>sa.reversar(a,'co',r.body.recepcion.id,motivo,'u1'),a),tx(()=>sb.reversar(b,'co',r.body.recepcion.id,motivo,'u2'),b)]);
    assert.equal(resultados.filter(r=>r.status==='fulfilled').length,1);assert.equal(resultados.find(r=>r.status==='rejected').reason.status,409);assert.equal((await estado()).p.cantidad_disponible,10);
   }finally{await a.end();await b.end();}
  });
  await t.test('trigger impide forzar version y no cambia por nombre',async()=>{
   await reset();const antes=(await estado()).p.version;await c.query("UPDATE productos SET version_inventario=0,nombre='Nuevo' WHERE id='pr'");assert.equal((await estado()).p.version,antes);
  });
 }finally{await sandbox.close();}
});
