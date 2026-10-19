const test=require('node:test'),assert=require('node:assert/strict');
test('cierres concurrentes reales no duplican pagos; metodos y actor persistidos',{skip:process.env.RUN_MYSQL_CIERRES_CONCURRENCIA_TESTS!=='1'},async()=>{
 const sandbox=await require('./helpers/comprasSandbox').crear(),c=sandbox.connection;
 const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),modulo={exports:{}};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../src/services/cierresCajaService.js'),'utf8'),{module:modulo,console,require:n=>n==='../config/db'?{dbConfig:{}}:n==='./liquidacionService'?require('../src/services/liquidacionService'):require(n)});
 const s=modulo.exports;
 const connections=[];
 try{
  await c.query("INSERT INTO usuarios(id,nombre,email,password_hash,estado,roles_id) VALUES ('u','Ana','caja@example.invalid','x','activo',1)");
  for(const [i,metodo]of ['efectivo','nequi','daviplata','tarjeta'].entries())await c.query("INSERT INTO pagos(id,metodo_de_pago,total_seleccionado,estado,verificacion_estado,verificado_en,creado_en,pedidos_id,usuarios_id) VALUES (?,?,?,'pagado','verificado','2026-10-14 12:00:00',NOW(),'p','u')",['p'+i,metodo,(i+1)*10]);
  const body={fecha_inicio:'2026-10-14T00:00:00',fecha_fin:'2026-10-15T00:00:00',total_efectivo_real:'9.50'};
  for(let i=0;i<2;i++)connections.push(await require('mysql2/promise').createConnection(sandbox.config));
  const results=await Promise.all(connections.map(async db=>{try{await db.beginTransaction();const result=await s.crear(db,body,'u');await db.commit();return result;}catch(e){await db.rollback();return {error:e};}}));
  assert.equal(results.filter(r=>r.status===201).length,1,JSON.stringify(results.map(r=>({status:r.status,error:r.error?.message}))));
  const result=results.find(r=>r.status===201).body.cierre;
  assert.equal(result.usuarios_id,'u');assert.equal(result.responsable_nombre,'Ana');assert.equal(result.total_general,'100.00');assert.equal(result.total_efectivo_esperado,'10.00');assert.equal(result.diferencia_efectivo,'-0.50');
  assert.deepEqual(JSON.parse(JSON.stringify(result.reporte.datos_json.por_metodo)),{efectivo:'10.00',nequi:'20.00',daviplata:'30.00',tarjeta:'40.00'});
  assert.equal((await c.query('SELECT COUNT(*) n FROM cierre_pagos'))[0][0].n,4);
  assert.equal((await c.query('SELECT COUNT(*) n FROM cierres_caja'))[0][0].n,1);
  const historial=(await s.listar(c,{})).body;assert.equal(historial.datos[0].responsable_nombre,'Ana');assert.deepEqual(historial.responsables,[{id:'u',nombre:'Ana'}]);
 }finally{for(const db of connections)await db.end();await sandbox.close();}
});
