const test=require('node:test'),assert=require('node:assert/strict');
const {listar,filtros}=require('../src/services/pagosLecturaService');
test('pagos global: validacion de filtros',()=>{
 for(const q of [{pagina:0},{limite:101},{estado:'otro'},{metodo_de_pago:'otro'},{desde:'2026-02-30'},{desde:'2026-10-15',hasta:'2026-10-14'}])assert.throws(()=>filtros(q),e=>e.status===400);
});
test('pagos global: mismos roles de lectura y autenticacion',()=>{
 const route=require('../src/routes/pagosRoutes').stack.find(l=>l.route?.path==='/'&&l.route.methods.get).route;
 for(const [rol,expected]of [['Administrador',200],['SuperAdmin',200],['Cajero',200],['Mesero',403],['Bartender',403],[null,401]]){
  let result;route.stack[0].handle({usuario:rol?{rol}:null},{status(s){result=s;return this;},json(){}},()=>result=200);assert.equal(result,expected);
 }
});
test('pagos global: lecturas reales, filtros, resumen, paginacion e identidades',{skip:process.env.RUN_MYSQL_PAGOS_GLOBAL_TESTS!=='1'},async()=>{
 const sandbox=await require('./helpers/comprasSandbox').crear(),c=sandbox.connection;
 try{
  await c.query("INSERT INTO usuarios(id,nombre,email,password_hash,estado,roles_id) VALUES ('u','Ana','ana@example.invalid','x','activo',1),('v','Luisa','luisa@example.invalid','x','activo',1)");
  await c.query("INSERT INTO clientes(id,nombre,estado,usuarios_id) VALUES ('cl','Laura','activo','u')");
  await c.query("INSERT INTO mesas(id,numero,estado) VALUES ('m',5,'ocupada'),('m2',6,'ocupada')");
  await c.query("INSERT INTO pedidos(id,estado,creado_en,mesas_id,usuarios_id,clientes_id) VALUES ('p','abierto',NOW(),'m','u','cl'),('p2','abierto',NOW(),'m2','u',NULL)");
  await c.query("INSERT INTO sesiones_division_cuentas(id,modalidad,usuarios_id,mesas_id) VALUES ('d','items','u','m')");
  await c.query("INSERT INTO division_participantes(id,sesion_division_id,nombre_cliente,total_asignado) VALUES ('dp','d','Carlos',3500)");
  for(const [id,estado,verificacion,metodo,monto,pedido,division,persona,fecha]of [
   ['a','pagado','verificado','nequi','3500.50','p','d','dp','2026-10-14 12:00:00'],
   ['b','pendiente','pendiente','efectivo','100','p',null,null,'2026-10-14 13:00:00'],
   ['c','cancelado','rechazado','tarjeta','200','p2',null,null,'2026-10-13 12:00:00']])await c.query('INSERT INTO pagos(id,estado,verificacion_estado,metodo_de_pago,total_seleccionado,pedidos_id,sesion_division_id,participante_id,creado_en,usuarios_id) VALUES (?,?,?,?,?,?,?,?,?,?)',[id,estado,verificacion,metodo,monto,pedido,division,persona,fecha,'u']);
  await require('../src/services/auditoriaService').registrarAuditoria(c,'v','pagos','pago_verificado','pagos','a',{});
  const r=await listar(c,{limite:1});assert.equal(r.paginacion.total,3);assert.equal(r.paginacion.totalPaginas,3);assert.equal(r.datos[0].id,'b');assert.deepEqual(r.resumen,{verificados:1,pendientes:1,rechazados:1,total_verificado:'3500.50'});
  assert.equal((await listar(c,{limite:1,pagina:2})).datos[0].id,'a');
  for(const [q,id]of [[{estado:'rechazado'},'c'],[{metodo_de_pago:'nequi'},'a'],[{mesas_id:'m2'},'c'],[{desde:'2026-10-13',hasta:'2026-10-13'},'c']]){const x=await listar(c,q);assert.equal(x.datos.length,1);assert.equal(x.datos[0].id,id);}
  const a=(await listar(c,{estado:'verificado'})).datos[0];assert.equal(a.cliente_nombre,'Carlos');assert.equal(a.registrado_por,'Ana');assert.equal(a.procesado_por,'Luisa');assert.equal(a.mesa_numero,5);
  assert.equal(r.datos[0].cliente_nombre,'Laura');assert.match(a.creado_en,/Z$/);
  assert.equal((await listar(c,{desde:'2027-01-01'})).paginacion.total,0);
 }finally{await sandbox.close();}
});
