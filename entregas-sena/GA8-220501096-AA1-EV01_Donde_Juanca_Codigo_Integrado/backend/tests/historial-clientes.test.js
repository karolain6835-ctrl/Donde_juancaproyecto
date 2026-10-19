const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');
const {consultar}=require('../src/services/historialClientesService');
test('Historial valida cliente, paginación y vacío',async()=>{
 await assert.rejects(()=>consultar({query:async()=>[[]]},'x'),e=>e.status===404);
 for(const query of [{pagina:'0'},{limite:'101'},{pagina:'1 OR 1=1'},{limite:['20']}])await assert.rejects(()=>consultar({},'c',query),e=>e.status===400);
 await assert.rejects(()=>consultar({},' c'),e=>e.status===400);
 let i=0;const results=[[[{id:'c',nombre:'Carlos'}]],[[{total:0}]],[[]]];
 const r=await consultar({query:async()=>results[i++]},'c');assert.deepEqual(r.datos,[]);assert.equal(r.paginacion.total,0);assert.equal(i,3);
});
test('Historial consulta por lote, separa dinero personal y pedido y no escribe',async()=>{
 const calls=[],results=[[[{id:'c',nombre:'Carlos'}]],[[{total:2}]],[[{id:'p2',fecha:'2026-10-16',cliente_del_pedido:0,participa:1},{id:'p1',fecha:'2026-10-15',cliente_del_pedido:1,participa:0}]],[[{pedido_id:'p2',total:'2844.44',consumo_cliente:'1000.00'}]],[[{pedido_id:'p2',total:'500.00',sin_finalizar:1}]],[[{pedido_id:'p2',total:'200.00'}]]];
 const r=await consultar({query:async(sql,args)=>{calls.push([sql,args]);return results.shift();}},'c',{pagina:'1',limite:'2'});
 assert.equal(r.datos[0].total_pedido,'3344.44');assert.equal(r.datos[0].consumo_cliente,'1000.00');assert.equal(r.datos[0].pagos_atribuidos,'200.00');assert.equal(r.datos[0].total_definitivo,false);assert.equal(r.datos[1].total_pedido,'0.00');
 assert.equal(calls.length,6);assert.ok(calls.every(([sql])=>sql.startsWith('SELECT')));
 assert.match(calls[1][0],/EXISTS/);assert.match(calls[2][0],/ORDER BY p.creado_en DESC,p.id DESC/);assert.deepEqual(calls[2][1].slice(-2),[2,0]);
 assert.match(calls[3][0],/i.pedido_id=i.pedidos_id/);assert.match(calls[5][0],/dp.sesion_division_id=pa.sesion_division_id/);
});
test('Historial mantiene roles de consulta de clientes',()=>{
 const {autorizarRoles}=require('../src/middleware/rolesMiddleware');
 const roles=['Administrador','SuperAdmin','Mesero','Mesera','Cajero'];
 for(const rol of [...roles,'Bartender']){let allowed=false;const res={status(){return this;},json(){}};autorizarRoles(...roles)({usuario:{id:'u',rol}},res,()=>allowed=true);assert.equal(allowed,roles.includes(rol));}
 assert.ok(fs.readFileSync(path.join(__dirname,'../src/routes/clientesRoutes.js'),'utf8').includes("router.get('/:id/historial', autorizarRoles('Administrador', 'SuperAdmin', 'Mesero', 'Mesera', 'Cajero')"));
});
test('Historial MySQL temporal: asociaciones reales, duplicados, orden y pagos atribuidos',{skip:process.env.RUN_MYSQL_HISTORIAL_CLIENTES!=='1'},async()=>{
 require('dotenv').config({path:path.join(__dirname,'../.env'),quiet:true});
 const c=await require('mysql2/promise').createConnection({host:process.env.DB_HOST,port:process.env.DB_PORT,user:process.env.DB_USER,password:process.env.DB_PASSWORD,database:process.env.DB_NAME,connectTimeout:5000});
 try{
  const tables={clientes:'id VARCHAR(36),nombre VARCHAR(100)',mesas:'id VARCHAR(36),numero INT',pedidos:'id VARCHAR(36),clientes_id VARCHAR(36),sesion_mesa_id VARCHAR(36),mesas_id VARCHAR(36),estado VARCHAR(20),creado_en DATETIME',jugadores:'id VARCHAR(36),clientes_id VARCHAR(36),sesion_mesa_id VARCHAR(36),pedido_id VARCHAR(36)',pedido_items:'id VARCHAR(36),pedidos_id VARCHAR(36),pedido_id VARCHAR(36),participante_id VARCHAR(36),estado VARCHAR(20),cantidad_pedida INT,precio_unitario DECIMAL(10,2)',sesiones_juego:'id VARCHAR(36),pedidos_id VARCHAR(36),pedido_items_id VARCHAR(36),estado VARCHAR(20),costo_total DECIMAL(10,2)',division_participantes:'id VARCHAR(36),jugadores_id VARCHAR(36),sesion_division_id VARCHAR(36)',pagos:'id VARCHAR(36),pedidos_id VARCHAR(36),participante_id VARCHAR(36),sesion_division_id VARCHAR(36),estado VARCHAR(20),verificacion_estado VARCHAR(20),total_seleccionado DECIMAL(10,2)'};
  for(const [name,columns]of Object.entries(tables))await c.query(`CREATE TEMPORARY TABLE ${name} (${columns})`);
  await c.query("INSERT INTO clientes VALUES ('c','Carlos'),('empty','Sin historial')");
  await c.query("INSERT INTO mesas VALUES ('m',5)");
  await c.query("INSERT INTO pedidos VALUES ('old','c',NULL,'m','cerrado','2026-10-15'),('new',NULL,'visit','m','abierto','2026-10-16'),('other',NULL,'other-visit','m','cerrado','2026-10-17')");
  await c.query("INSERT INTO jugadores VALUES ('j','c','visit',NULL),('duplicate','c','visit',NULL),('legacy','c',NULL,'old'),('someone','other','visit',NULL)");
  await c.query("INSERT INTO pedido_items VALUES ('i','new','new','j','servido',1,2844.44),('cancelled','new','new','j','cancelado',2,100),('foreign','new','new','someone','servido',1,1000)");
  await c.query("INSERT INTO sesiones_juego VALUES ('game','new',NULL,'cerrada',500)");
  await c.query("INSERT INTO division_participantes VALUES ('payer','j','d'),('unknown',NULL,'d')");
  await c.query("INSERT INTO pagos VALUES ('paid','new','payer','d','pagado','verificado',1000),('pending','new','payer','d','pendiente','pendiente',200),('direct','new',NULL,NULL,'pagado','verificado',300),('unknown','new','unknown','d','pagado','verificado',50)");
  const r=await consultar(c,'c');assert.deepEqual(r.datos.map(x=>x.id),['new','old']);assert.equal(r.paginacion.total,2);assert.equal(r.datos[0].consumo_cliente,'2844.44');assert.equal(r.datos[0].total_pedido,'4344.44');assert.equal(r.datos[0].pagos_atribuidos,'1000.00');
  assert.deepEqual((await consultar(c,'empty')).datos,[]);await assert.rejects(()=>consultar(c,'missing'),e=>e.status===404);
  assert.equal((await consultar(c,'c',{pagina:'2',limite:'1'})).datos[0].id,'old');
 }finally{await c.end();}
});
