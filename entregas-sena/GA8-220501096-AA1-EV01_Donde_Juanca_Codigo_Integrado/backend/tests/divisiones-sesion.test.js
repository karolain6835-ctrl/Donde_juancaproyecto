const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {crear,ejecutarSQL}=require('./helpers/comprasSandbox');
test('Divisiones 8A: identidad, cantidades, dinero, concurrencia y pagos',{skip:process.env.RUN_MYSQL_DIVISIONES_TESTS!=='1'},async t=>{
 const sandbox=await crear(),c=sandbox.connection;let fail=false,writes=0;
 const load=file=>{const m={exports:{}};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../src/controllers',file),'utf8'),{module:m,exports:m.exports,console:{error(){}},require:n=>{
  if(n==='../config/db')return {dbConfig:sandbox.config,query:(sql,args,cb)=>{if(typeof args==='function'){cb=args;args=[];}c.query(sql,args).then(([r])=>cb(null,r),cb);}};
  if(n==='mysql2')return {createConnection(config){const real=require('mysql2').createConnection(config).promise();return {promise:()=>({beginTransaction:()=>real.beginTransaction(),commit:()=>real.commit(),rollback:()=>real.rollback(),end:()=>real.end(),query(sql,args){if(fail&&sql.includes('INSERT INTO auditoria'))throw new Error('Fallo auditoria');return real.query(sql,args);}})};}};
  return require(n.startsWith('.')?path.join(__dirname,'../src/controllers',n):n);
 }});return m.exports;};
 const api=load('divisionesController.js'),pagos=load('pagosController.js');
 const call=(fn,body={},params={},key='clave-0001')=>new Promise((resolve,reject)=>Promise.resolve(fn({body,params,usuario:{id:'u',rol:'Administrador'},get:()=>key},{status(s){this.s=s;return this;},json(data){resolve({status:this.s||200,data});}})).catch(reject));
 const post=(value,key='clave-asignacion',division='d')=>call(api.asignarItemsACliente,value,{id:division},key);
 const snapshot=async()=>JSON.stringify(await Promise.all(['pedido_items','movimientos_inventario','rondas_consumo','productos'].map(async table=>(await c.query('SELECT * FROM '+table+' ORDER BY id'))[0])));
 try{
  await c.query("INSERT INTO usuarios(id,nombre,email,password_hash,estado,roles_id) VALUES ('u','Actor','u@example.invalid','fixture','activo',1)");
  await c.query("INSERT INTO mesas(id,numero,estado,creado_en) VALUES ('m',1,'ocupada',NOW()),('m2',2,'ocupada',NOW())");
  await c.query("INSERT INTO sesiones_mesa(id,mesas_id,estado,iniciada_en) VALUES ('s','m','activa',NOW()),('s2','m2','activa',NOW())");
  await c.query("INSERT INTO pedidos(id,estado,creado_en,mesas_id,usuarios_id,clientes_id,sesion_mesa_id) VALUES ('p','abierto',NOW(),'m','u',NULL,'s'),('p2','abierto',NOW(),'m2','u',NULL,'s2')");
  for(const [id,s,mesa] of [['a','s','m'],['b','s','m'],['externo','s2','m2']])await c.query("INSERT INTO jugadores(id,nombre,mesas_id,tipo_participante,sesion_mesa_id) VALUES (?,?,?,'temporal',?)",[id,id,mesa,s]);
  for(const id of ['pr','otro'])await c.query("INSERT INTO productos(id,nombre,codigo,precio_venta,costo_promedio_ponderado,cantidad_disponible,stock_minimo,estado,categorias_id,proveedores_id,historial_costos_id) VALUES (?,?,?,100,0,100,1,'activo',1,'prov','hist')",[id,id,id]);

  await c.query("INSERT INTO pedido_items(id,precio_unitario,pedido_id,producto_id,cantidad_pedida,cantidad_pagada,estado,pedidos_id,productos_id,participante_id) VALUES ('i',10.25,'p','pr',4,0,'servido','p','pr','b'),('cancelado',10,'p','pr',1,0,'cancelado','p','pr','a'),('externo-i',10,'p2','pr',2,0,'servido','p2','pr','externo'),('i2',2.50,'p','otro',4,0,'enviado','p','otro','b')");
  await c.query("INSERT INTO clientes(id,nombre,estado,usuarios_id) VALUES ('cliente','Registrado','activo','u')");
  await c.query("UPDATE jugadores SET tipo_participante='registrado',clientes_id='cliente' WHERE id='a'");
  let first;
  await t.test('crear con visita activa; sin visita y modalidades futuras rechazadas',async()=>{
   const r=await call(api.iniciarSesionDivision,{mesas_id:'m',modalidad:'items'});assert.equal(r.status,201,JSON.stringify(r));first=r.data.data;
   assert.equal(first.sesion_mesa_id,'s');assert.equal(first.usuarios_id,'u');
   await c.query("UPDATE sesiones_division_cuentas SET id='d' WHERE id=?",[first.id]);
   await c.query("INSERT INTO mesas(id,numero,estado,creado_en) VALUES ('sinvisita',3,'disponible',NOW())");
   assert.equal((await call(api.iniciarSesionDivision,{mesas_id:'sinvisita',modalidad:'items'})).status,409);
   assert.equal((await call(api.iniciarSesionDivision,{mesas_id:'m',modalidad:'equitativa'})).status,201);
  });
  const value={jugadores_id:'a',items:[{pedido_item_id:'i',cantidad:2}]};let assigned;
  const assignments=async()=>JSON.stringify(await Promise.all(['division_participantes','division_items_detalle','auditoria'].map(async table=>(await c.query('SELECT * FROM '+table+' ORDER BY id'))[0])));
  await t.test('pagador registrado distinto del consumidor, precio historico y stock intacto',async()=>{
   const stock=await snapshot();const r=await post(value);assert.equal(r.status,201,JSON.stringify(r));assigned=r.data.data;
   assert.equal(assigned.jugadores_id,'a');assert.equal(assigned.total_asignado,'20.50');
   assert.equal((await c.query("SELECT participante_id FROM pedido_items WHERE id='i'"))[0][0].participante_id,'b');
   assert.equal(await snapshot(),stock);
   const detail=await call(api.obtenerResumenDivision,{}, {id:'d'});assert.equal(detail.status,200);assert.equal(detail.data.data.total_acumulado,20.50);assert.equal(detail.data.data.participantes[0].jugadores_id,'a');
  });
  await t.test('reintento identico no duplica y clave distinta con mismo cuerpo si consume capacidad',async()=>{
   const before=await assignments();assert.equal((await post(value)).status,200);assert.equal(await assignments(),before);
   assert.equal((await post({...value,items:[{pedido_item_id:'i',cantidad:1}]})).status,409);assert.equal(await assignments(),before);
  });
  await t.test('producto cancelado, ausente o de otra visita; pagador ajeno; cantidades invalidas; precio manual',async()=>{
   const before=await assignments();
   for(const item of ['cancelado','no-existe','externo-i'])assert.equal((await post({jugadores_id:'a',items:[{pedido_item_id:item,cantidad:1}]},'invalid-'+item)).status,409);
   assert.equal((await post({jugadores_id:'externo',items:[{pedido_item_id:'i',cantidad:1}]},'pagador-ajeno')).status,409);
   for(const cantidad of [0,-1,1.5,'1'])assert.equal((await post({jugadores_id:'a',items:[{pedido_item_id:'i',cantidad}]},'invalid-qty')).status,400);
   assert.equal((await post({jugadores_id:'a',items:[{pedido_item_id:'i',cantidad:1,precio_unitario:0.01}]},'precio-manual')).status,400);
   assert.equal(await assignments(),before);
  });
  await t.test('reparto 2+1+1 valido; 5 unidades imposible incluso en otra division',async()=>{
   for(const [person,key]of [['b','parte-laura'],['a','parte-carlos']])assert.equal((await post({jugadores_id:person,items:[{pedido_item_id:'i',cantidad:1}]},key)).status,201);
   const other=await call(api.iniciarSesionDivision,{mesas_id:'m',modalidad:'items'});assert.equal(other.status,201);
   assert.equal((await post({jugadores_id:'b',items:[{pedido_item_id:'i',cantidad:1}]},'sobreasigna',other.data.data.id)).status,409);
  });
  await t.test('concurrencia: mismo key una asignacion; dos claves compiten por capacidad',async()=>{
   const v={jugadores_id:'b',items:[{pedido_item_id:'i2',cantidad:2}]};
   const same=await Promise.all([post(v,'concurrent-same'),post(v,'concurrent-same')]);assert.deepEqual(same.map(r=>r.status).sort(),[200,201]);
   const remaining={...v,items:[{pedido_item_id:'i2',cantidad:2}]};
   const race=await Promise.all([post(remaining,'concurrent-A'),post(remaining,'concurrent-B')]);assert.deepEqual(race.map(r=>r.status).sort(),[201,409]);
  });
  await t.test('rollback de auditoria; historicos consultables y no asignables',async()=>{
   await c.query("INSERT INTO pedido_items(id,precio_unitario,pedido_id,producto_id,cantidad_pedida,cantidad_pagada,estado,pedidos_id,productos_id) VALUES ('i3',0.51,'p','pr',4,0,'enviado','p','pr')");
   const before=await assignments();fail=true;
   assert.equal((await post({jugadores_id:'b',items:[{pedido_item_id:'i3',cantidad:1}]},'rollback-audit')).status,500);fail=false;
   assert.equal(await assignments(),before);
   assert.equal((await post({jugadores_id:'b',items:[{pedido_item_id:'i3',cantidad:3},{pedido_item_id:'i3',cantidad:2}]},'duplicate-over')).status,409);
   const decimal=await post({jugadores_id:'b',items:[{pedido_item_id:'i3',cantidad:1}]},'decimal-051');assert.equal(decimal.status,201);assert.equal(decimal.data.data.total_asignado,'0.51');
   await c.query("INSERT INTO sesiones_division_cuentas(id,modalidad,usuarios_id,mesas_id) VALUES ('legacy','items','u','m')");
   const r=await call(api.obtenerResumenDivision,{}, {id:'legacy'});assert.equal(r.status,200);assert.equal(r.data.data.sesion.sesion_mesa_id,null);
   assert.equal((await post(value,'legacy-key','legacy')).status,409);
  });
  await t.test('pagos: asignacion del mismo pedido, limite y verificacion; otra visita rechazada',async()=>{
   const body={metodo_de_pago:'efectivo',total_seleccionado:'20.50',pedidos_id:'p',sesion_division_id:'d',participante_id:assigned.participante_id};
   assert.equal((await call(pagos.registrarPago,{...body,pedidos_id:'p2'})).status,409);
   await c.query("INSERT INTO pedidos(id,estado,creado_en,mesas_id,usuarios_id,clientes_id,sesion_mesa_id) VALUES ('ajeno','abierto',NOW(),'m','u',NULL,'s2')");
   await c.query("INSERT INTO pedido_items(id,precio_unitario,pedido_id,producto_id,cantidad_pedida,cantidad_pagada,estado,pedidos_id,productos_id) VALUES ('ia',100,'ajeno','pr',1,0,'servido','ajeno','pr')");
   assert.equal((await call(pagos.registrarPago,{...body,pedidos_id:'ajeno'})).status,409);
   await c.query("INSERT INTO pedidos(id,estado,creado_en,mesas_id,usuarios_id,clientes_id,sesion_mesa_id) VALUES ('p3','abierto',NOW(),'m','u',NULL,'s')");
   await c.query("INSERT INTO pedido_items(id,precio_unitario,pedido_id,producto_id,cantidad_pedida,cantidad_pagada,estado,pedidos_id,productos_id) VALUES ('ip3',100,'p3','pr',1,0,'servido','p3','pr')");
   assert.equal((await call(pagos.registrarPago,{...body,pedidos_id:'p3'})).status,409);
   assert.equal((await call(pagos.registrarPago,{...body,participante_id:null})).status,400);
   const r=await call(pagos.registrarPago,body);assert.equal(r.status,201,JSON.stringify(r));
   await c.query("UPDATE pedido_items SET estado='cancelado' WHERE id='i'");
   assert.equal((await call(pagos.verificarPago,{verificacion_estado:'verificado'},{id:r.data.id_pago})).status,409);
   await c.query("UPDATE pedido_items SET estado='servido' WHERE id='i'");
   assert.equal((await call(pagos.verificarPago,{verificacion_estado:'verificado'},{id:r.data.id_pago})).status,200);
   assert.equal((await c.query('SELECT estado FROM division_participantes WHERE id=?',[assigned.participante_id]))[0][0].estado,'pagado');
   assert.equal((await call(pagos.registrarPago,{...body,total_seleccionado:'0.01'})).status,409);
   await c.query("UPDATE sesiones_mesa SET estado='cerrada',cerrada_en=NOW() WHERE id='s'");
   assert.equal((await post(value)).status,200);
   assert.equal((await post(value,'closed-new')).status,409);
  });
 }finally{await sandbox.close();}
});
