const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
test('Fase 3B: actores y atomicidad con MySQL temporal',{skip:process.env.RUN_MYSQL_AUDITORIA_TESTS!=='1'},async t=>{
 require('dotenv').config({path:path.join(__dirname,'../.env'),quiet:true});
 const real=await require('mysql2/promise').createConnection({host:process.env.DB_HOST,port:process.env.DB_PORT,user:process.env.DB_USER,password:process.env.DB_PASSWORD,database:process.env.DB_NAME});
 let fallo=null,auditorias=0;
 const c={beginTransaction:()=>real.beginTransaction(),query:async(sql,p)=>{
  if(sql.includes('INSERT INTO auditoria')){auditorias++;if(fallo==='segunda'&&auditorias===2)throw new Error('Fallo segunda auditoria');}
  if(sql.includes('INSERT INTO auditoria')&&fallo==='auditoria')throw new Error('Fallo auditoria');
  if(sql.includes('INSERT INTO auditoria')&&fallo==='cero')return [{affectedRows:0}];
  return real.query(sql,p);
 },commit:async()=>{if(fallo==='commit')throw new Error('Fallo commit');return real.commit();},rollback:()=>real.rollback(),end:async()=>{}};
 const cache=new Map();
 const load=file=>{
  file=path.resolve(__dirname,'../src',file);if(cache.has(file))return cache.get(file);
  const m={exports:{}};vm.runInNewContext(fs.readFileSync(file,'utf8'),{module:m,exports:m.exports,console:{error(){},log(){}},require:n=>{
   if(n==='mysql2')return {createConnection:()=>({promise:()=>c})};
   if(n==='../config/db')return {dbConfig:{},query:(sql,p,cb)=>real.query(sql,p).then(([r])=>cb(null,r),cb)};
   if(n.startsWith('.'))return load(path.resolve(path.dirname(file),n+'.js'));
   return require(n);
  }});cache.set(file,m.exports);return m.exports;
 };
 const call=async(fn,body={},params={})=>{let r;await fn({body,params,usuario:{id:'u2'},get:()=> 'audit-clave-1'},{status(s){this.s=s;return this;},json(data){r={status:this.s||200,data};}});return r;};
 try{
  for(const table of ['auditoria','usuarios','mesas','pedidos','pedido_items','pagos','sesiones_juego','clientes','compras','compra_items','productos','sesiones_division_cuentas','sesiones_division','division_participantes','division_items_detalle','jugadores','ronda_jugadores','rondas']){
   await real.query('CREATE TEMPORARY TABLE copia_audit_'+table+' LIKE '+table);await real.query('CREATE TEMPORARY TABLE '+table+' LIKE copia_audit_'+table);
  }
  await require('./helpers/participantesTemporales')(real, { items: true });
  await require('./helpers/divisionesTemporales')(real,{participantes:true});
  const [columnasCompra]=await real.query('SHOW COLUMNS FROM compras');
  if(!columnasCompra.some(c=>c.Field==='modelo_recepcion'))for(const statement of fs.readFileSync(path.join(__dirname,'../database/v2.31_compras_recepciones_parciales.sql'),'utf8').split(';').filter(s=>s.trim()))await real.query(statement);
  for(const u of ['u1','u2'])await real.query("INSERT INTO usuarios(id,nombre,email,password_hash,estado,roles_id) VALUES (?,?,?,'fixture','activo',1)",[u,u,u+'@example.invalid']);
  await real.query("INSERT INTO clientes(id,nombre,estado,usuarios_id) VALUES ('cl','Cliente','activo','u1')");
  const reset=async()=>{
   fallo=null;auditorias=0;await real.query('DELETE FROM sesiones_mesa');await real.query('DELETE FROM jugadores');for(const table of ['auditoria','pagos','pedido_items','pedidos','compras','division_items_detalle','division_participantes','sesiones_division_cuentas','mesas'])await real.query('DELETE FROM '+table);
   await real.query("UPDATE clientes SET nombre='Cliente',estado='activo'");
   await real.query("INSERT INTO mesas(id,numero,estado) VALUES ('m1',1,'ocupada'),('m2',2,'disponible')");
   await real.query("INSERT INTO pedidos(id,estado,creado_en,mesas_id,usuarios_id,clientes_id) VALUES ('p','abierto',UTC_TIMESTAMP(),'m1','u1','cl')");
   await real.query("INSERT INTO pedido_items(id,precio_unitario,pedido_id,producto_id,cantidad_pedida,cantidad_pagada,estado,pedidos_id,productos_id) VALUES ('i',10,'p','pr',1,0,'preparando','p','pr')");
   await real.query("INSERT INTO pagos(id,metodo_de_pago,total_seleccionado,estado,verificacion_estado,creado_en,pedidos_id,usuarios_id) VALUES ('pa','efectivo',10,'pendiente','pendiente',UTC_TIMESTAMP(),'p','u1')");
   await real.query("INSERT INTO compras(id,estado,total_estimado,total_recibido,creado_en,proveedores_id,usuarios_id) VALUES ('co','pendiente',10,0,UTC_TIMESTAMP(),'prov','u1')");
   await real.query("INSERT INTO sesiones_division_cuentas(id,modalidad,usuarios_id,mesas_id,sesion_mesa_id) VALUES ('di','items','u1','m1','visita')");
   await real.query("INSERT INTO sesiones_mesa(id,mesas_id,estado,iniciada_en) VALUES ('visita','m1','activa',NOW())");
   await real.query("UPDATE pedidos SET sesion_mesa_id='visita' WHERE id='p'");
   await real.query("INSERT INTO jugadores(id,nombre,mesas_id,tipo_participante,sesion_mesa_id) VALUES ('pagador','Persona','m1','temporal','visita')");
  };
  const pagos=load('controllers/pagosController.js'),compras=load('controllers/comprasController.js'),clientes=load('controllers/clientesController.js'),mesas=load('controllers/mesasController.js'),divisiones=load('controllers/divisionesController.js');
  const events=async()=>{const [r]=await real.query('SELECT * FROM auditoria');return r.map(e=>({...e,cambios_json:JSON.parse(e.cambios_json)}));};
  const scenarios=[
   ['pago_verificado',()=>call(pagos.verificarPago,{verificacion_estado:'verificado'},{id:'pa'}),200,"SELECT estado AS valor FROM pagos WHERE id='pa'",'pendiente'],
   ['pago_rechazado',()=>call(pagos.verificarPago,{verificacion_estado:'rechazado'},{id:'pa'}),200,"SELECT estado AS valor FROM pagos WHERE id='pa'",'pendiente'],
   ['compra_cancelada',()=>call(compras.cancelarCompra,{}, {id:'co'}),200,"SELECT estado AS valor FROM compras WHERE id='co'",'pendiente'],
   ['cliente_actualizado',()=>call(clientes.actualizarCliente,{nombre:'Editado'},{id:'cl'}),200,"SELECT nombre AS valor FROM clientes WHERE id='cl'",'Cliente'],
   ['mesa_estado_cambiado',()=>call(mesas.actualizarEstadoMesa,{estado:'en_cobro'},{id:'m1'}),200,"SELECT estado AS valor FROM mesas WHERE id='m1'",'ocupada'],
   ['mesa_trasladada',()=>call(mesas.trasladarMesa,{mesa_origen_id:'m1',mesa_destino_id:'m2'}),200,"SELECT mesas_id AS valor FROM pedidos WHERE id='p'",'m1'],
   ['division_items_asignados',()=>call(divisiones.asignarItemsACliente,{jugadores_id:'pagador',items:[{pedido_item_id:'i',cantidad:1}]},{id:'di'}),201,'SELECT COUNT(*) AS valor FROM division_participantes',0]
  ];
  for(const [evento,accion,status,query,anterior]of scenarios){
   await t.test(evento+' actor y originales',async()=>{
    await reset();const r=await accion();assert.equal(r.status,status,JSON.stringify(r));const a=await events();
    assert.ok(a.some(e=>e.tipo_evento===evento));assert.ok(a.every(e=>e.usuarios_id==='u2'&&e.creado_en&&e.resultado==='exitoso'));
    for(const table of ['pagos','pedidos','compras','clientes','sesiones_division_cuentas']){const [[original]]=await real.query('SELECT usuarios_id FROM '+table+' LIMIT 1');assert.equal(original.usuarios_id,'u1');}
    if(evento==='pago_verificado'){
     const l=a.find(e=>e.tipo_evento==='liquidacion_actualizada');assert.equal(l.cambios_json.pago_id,'pa');assert.equal(l.cambios_json.despues.estado_pedido,'cerrado');assert.equal(l.cambios_json.despues.estado_mesa,'disponible');
    }
    if(evento.startsWith('pago_')){await accion();assert.equal((await events()).length,2);}
   });
   if(evento==='pago_verificado')await t.test('rollback de liquidacion y primer evento si falla el segundo',async()=>{
    await reset();fallo='segunda';assert.equal((await accion()).status,500);assert.equal((await events()).length,0);
    const [[p]]=await real.query("SELECT estado,verificado_en FROM pagos WHERE id='pa'");assert.equal(p.estado,'pendiente');assert.equal(p.verificado_en,null);
    const [[m]]=await real.query("SELECT estado FROM mesas WHERE id='m1'");assert.equal(m.estado,'ocupada');
   });
   for(const error of ['auditoria','cero','commit'])await t.test(evento+' rollback '+error,async()=>{
    await reset();fallo=error;assert.equal((await accion()).status,500);const [[r]]=await real.query(query);assert.equal(r.valor,anterior);assert.equal((await events()).length,0);
    if(evento.startsWith('pago_')){const [[p]]=await real.query("SELECT estado FROM pedidos WHERE id='p'");assert.equal(p.estado,'abierto');}
    if(evento==='division_items_asignados'){const [[d]]=await real.query('SELECT COUNT(*) AS n FROM division_items_detalle');assert.equal(d.n,0);}
   });
  }
 }finally{await real.end();}
});
