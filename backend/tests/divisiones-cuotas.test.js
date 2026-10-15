const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {crear,ejecutarSQL}=require('./helpers/comprasSandbox');
test('Divisiones 8B: modalidades, ciclo de vida, saldos y traslados',{skip:process.env.RUN_MYSQL_DIVISION_CUOTAS_TESTS!=='1'},async t=>{
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


  await c.query("INSERT INTO jugadores(id,nombre,mesas_id,tipo_participante,sesion_mesa_id) VALUES ('c','Andres','m','temporal','s')");
  let sequence=0;
  async function nueva(modalidad,total='100.00'){
   const pedido='pedido-cuota-'+(++sequence);
   await c.query("INSERT INTO pedidos(id,estado,creado_en,mesas_id,usuarios_id,clientes_id,sesion_mesa_id) VALUES (?,'abierto',NOW(),'m','u',NULL,'s')",[pedido]);
   await c.query("INSERT INTO pedido_items(id,precio_unitario,pedido_id,producto_id,cantidad_pedida,cantidad_pagada,estado,pedidos_id,productos_id) VALUES (?, ?,?,'pr',1,0,'servido',?,'pr')",['item-'+sequence,total,pedido,pedido]);
   const r=await call(api.iniciarSesionDivision,{mesas_id:'m',modalidad});assert.equal(r.status,201,JSON.stringify(r));
   return {id:r.data.data.id,pedido};
  }
  const cuotas=(d,body,key='cuotas-clave-1')=>call(api.definirCuotas,{pedido_id:d.pedido,...body},{id:d.id},key);
  const leer=d=>call(api.obtenerResumenDivision,{}, {id:d.id});
  const cancelar=d=>call(api.cancelarDivision,{}, {id:d.id});
  const completar=d=>call(api.completarDivision,{}, {id:d.id});
  const pagar=(d,person,monto)=>call(pagos.registrarPago,{pedidos_id:d.pedido,sesion_division_id:d.id,participante_id:person,metodo_de_pago:'efectivo',total_seleccionado:monto});
  const verificar=p=>call(pagos.verificarPago,{verificacion_estado:'verificado'},{id:p.data.id_pago});
  await t.test('equitativa dos y tres con centavos deterministas; reintento no duplica',async()=>{
   for(const [total,ids,expected]of [['100.00',['b','a'],['50.00','50.00']],['100.00',['c','b','a'],['33.34','33.33','33.33']]]){
    const d=await nueva('equitativa',total),r=await cuotas(d,{jugadores_ids:ids});assert.equal(r.status,201,JSON.stringify(r));
    const byId=r.data.data.participantes.sort((a,b)=>a.jugadores_id.localeCompare(b.jugadores_id));assert.deepEqual(byId.map(p=>p.asignado),expected);
    const replay=await cuotas(d,{jugadores_ids:[...ids].reverse()});assert.equal(replay.status,200);assert.deepEqual(replay.data.data.participantes.map(p=>p.id).sort(),byId.map(p=>p.id).sort());
    assert.equal((await cuotas(d,{jugadores_ids:['a']})).status,409);
    assert.equal((await completar(d)).status,409);
    assert.equal((await cancelar(d)).status,200);assert.equal((await cancelar(d)).status,200);assert.equal((await completar(d)).status,409);
    assert.equal((await cuotas(d,{jugadores_ids:ids},'new-after-cancel')).status,409);
   }
  });
  await t.test('personalizadas exactas; mayor menor cero duplicados y ajenos rechazados atomicamente',async()=>{
   const d=await nueva('personalizada','90.00');
   for(const amounts of [['40','35','14'],['40','35','16']])assert.equal((await cuotas(d,{cuotas:amounts.map((m,i)=>({jugadores_id:['a','b','c'][i],monto:m}))})).status,409);
   assert.equal((await cuotas(d,{cuotas:[{jugadores_id:'a',monto:0}]})).status,400);
   assert.equal((await cuotas(d,{cuotas:[{jugadores_id:'a',monto:45},{jugadores_id:'a',monto:45}]})).status,400);
   assert.equal((await cuotas(d,{cuotas:[{jugadores_id:'externo',monto:90}]})).status,409);
   assert.equal((await leer(d)).data.data.participantes.length,0);
   const r=await cuotas(d,{cuotas:[{jugadores_id:'a',monto:'40.00'},{jugadores_id:'b',monto:'35.00'},{jugadores_id:'c',monto:'15.00'}]});assert.equal(r.status,201);assert.equal(r.data.data.total_asignado,'90.00');
   await cancelar(d);
  });
  await t.test('total, pagos parciales, pendientes, cancelacion protegida y completar',async()=>{
   const d=await nueva('total','10.01'),r=await cuotas(d,{jugadores_id:'a'});assert.equal(r.status,201);const person=r.data.data.participantes[0].id;
   assert.equal(r.data.data.total_objetivo,'10.01');
   const first=await pagar(d,person,'3.00');assert.equal(first.status,201,JSON.stringify(first));
   assert.equal((await cancelar(d)).status,409);assert.equal((await completar(d)).status,409);
   let summary=(await leer(d)).data.data;assert.equal(summary.participantes[0].pendiente_verificacion,'3.00');assert.equal(summary.participantes[0].saldo,'10.01');
   assert.equal((await verificar(first)).status,200);assert.equal((await cancelar(d)).status,409);
   summary=(await leer(d)).data.data;assert.equal(summary.total_pagado,'3.00');assert.equal(summary.total_pendiente,'7.01');assert.equal(summary.desactualizada,false);
   const rest=await pagar(d,person,'7.01');assert.equal(rest.status,201);assert.equal((await verificar(rest)).status,200);
   assert.equal((await completar(d)).status,200);assert.equal((await completar(d)).status,200);assert.equal((await cancelar(d)).status,409);
   assert.equal((await pagar(d,person,'0.01')).status,409);
   assert.equal((await cuotas(d,{jugadores_id:'a'})).status,200);
   assert.equal((await cuotas(d,{jugadores_id:'b'},'another-key')).status,409);
  });
  await t.test('cancelacion despues de rechazo; nueva division no duplica consumos',async()=>{
   const d=await nueva('total'),r=await cuotas(d,{jugadores_id:'b'}),person=r.data.data.participantes[0].id;
   const pay=await pagar(d,person,'5.00');assert.equal(pay.status,201);
   assert.equal((await cancelar(d)).status,409);
   assert.equal((await call(pagos.verificarPago,{verificacion_estado:'rechazado'},{id:pay.data.id_pago})).status,200);
   assert.equal((await cancelar(d)).status,200);assert.equal((await pagar(d,person,'5.00')).status,409);
   const again=await call(api.iniciarSesionDivision,{mesas_id:'m',modalidad:'total'});const replacement={id:again.data.data.id,pedido:d.pedido};assert.equal((await cuotas(replacement,{jugadores_id:'b'})).status,201);
  });
  await t.test('nuevo consumo marca desactualizada sin cambiar cuotas ni permitir pago/cierre',async()=>{
   const d=await nueva('total'),r=await cuotas(d,{jugadores_id:'a'}),person=r.data.data.participantes[0].id;
   await c.query("UPDATE pedido_items SET cantidad_pedida=2 WHERE pedidos_id=?",[d.pedido]);
   const summary=(await leer(d)).data.data;assert.equal(summary.desactualizada,true);assert.equal(summary.total_objetivo,'100.00');assert.equal(summary.saldo_actual,'200.00');
   assert.equal((await pagar(d,person,'50.00')).status,409);assert.equal((await completar(d)).status,409);assert.equal((await cancelar(d)).status,200);
  });
  await t.test('scope por pedido y reservas: no cuotas multi-pedido ni doble division activa',async()=>{
   const d=await nueva('total'),r=await cuotas(d,{jugadores_id:'a'});assert.equal(r.status,201);
   const other=await call(api.iniciarSesionDivision,{mesas_id:'m',modalidad:'total'});assert.equal((await cuotas({id:other.data.data.id,pedido:d.pedido},{jugadores_id:'b'})).status,409);
   assert.equal((await cuotas(d,{jugadores_id:'a',pedidos_ids:[d.pedido]})).status,400);
   await cancelar(d);
  });
  await t.test('objetivo descuenta pagos anteriores; configuración concurrente no duplica',async()=>{
   const d=await nueva('total');
   const anterior=await call(pagos.registrarPago,{pedidos_id:d.pedido,metodo_de_pago:'efectivo',total_seleccionado:'20.00'});assert.equal(anterior.status,201);assert.equal((await verificar(anterior)).status,200);
   const results=await Promise.all([cuotas(d,{jugadores_id:'a'}),cuotas(d,{jugadores_id:'a'})]);assert.deepEqual(results.map(r=>r.status).sort(),[200,201]);
   for(const r of results){assert.equal(r.data.data.total_objetivo,'80.00');assert.equal(r.data.data.desactualizada,false);assert.equal(r.data.data.participantes.length,1);}
   assert.equal((await cancelar(d)).status,200);
  });
  await t.test('items conserva flujo; cancelar libera cantidades y completar exige pagos',async()=>{
   const d=await nueva('items','5.00'),v={jugadores_id:'a',items:[{pedido_item_id:'item-'+sequence,cantidad:1}]};
   assert.equal((await post(v,'items-first',d.id)).status,201);assert.equal((await completar(d)).status,409);
   assert.equal((await cancelar(d)).status,200);assert.equal((await post(v,'items-closed',d.id)).status,409);
   const next=await call(api.iniciarSesionDivision,{mesas_id:'m',modalidad:'items'}),replacement={id:next.data.data.id,pedido:d.pedido};
   const assignment=await post(v,'items-second',replacement.id);assert.equal(assignment.status,201,JSON.stringify(assignment));
   const payment=await pagar(replacement,assignment.data.data.participante_id,'5.00');assert.equal(payment.status,201);assert.equal((await verificar(payment)).status,200);
   const completed=await completar(replacement);assert.equal(completed.status,200,JSON.stringify(completed));assert.ok(completed.data.data.sesion.completada_en);
   assert.equal((await cancelar(replacement)).status,409);
  });
  await t.test('traslado ignora completadas y canceladas; activa bloquea destino',async()=>{
   const mesas=load('mesasController.js');
   for(const [state,expected]of [['completada',200],['cancelada',200],['activa',400]]){
    const n=++sequence,origin='origen-'+n,dest='destino-'+n;
    await c.query("INSERT INTO mesas(id,numero,estado,creado_en) VALUES (?,?,'ocupada',NOW()),(?,?,'disponible',NOW())",[origin,100+n,dest,200+n]);
    await c.query("INSERT INTO pedidos(id,estado,creado_en,mesas_id,usuarios_id,clientes_id) VALUES (?,'abierto',NOW(),?,'u',NULL)",['transfer-'+n,origin]);
    await c.query("INSERT INTO sesiones_division_cuentas(id,modalidad,usuarios_id,mesas_id,estado,completada_en,cancelada_en) VALUES (?,'items','u',?,?,?,?)",['historica-'+n,dest,state,state==='completada'?new Date():null,state==='cancelada'?new Date():null]);
    const r=await call(mesas.trasladarMesa,{mesa_origen_id:origin,mesa_destino_id:dest});assert.equal(r.status,expected,JSON.stringify(r));
   }
  });
  await t.test('historico NULL consultable y stock/pedido_items no creados por cuotas',async()=>{
   await c.query("INSERT INTO sesiones_division_cuentas(id,modalidad,usuarios_id,mesas_id) VALUES ('legacy8b','items','u','m')");
   const r=await call(api.obtenerResumenDivision,{}, {id:'legacy8b'});assert.equal(r.status,200);assert.equal(r.data.data.sesion.sesion_mesa_id,null);
   assert.equal((await c.query("SELECT cantidad_disponible FROM productos WHERE id='pr'"))[0][0].cantidad_disponible,100);
   assert.equal((await c.query('SELECT COUNT(*) AS n FROM movimientos_inventario'))[0][0].n,0);
  });
 }finally{await sandbox.close();}
});
