const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
test('Cierres: MySQL real y tablas temporales', {skip:process.env.RUN_MYSQL_CIERRES_TESTS!=='1'},async t=>{
  require('dotenv').config({path:path.join(__dirname,'../.env'),quiet:true});
  const real=await require('mysql2/promise').createConnection({host:process.env.DB_HOST,port:process.env.DB_PORT,user:process.env.DB_USER,password:process.env.DB_PASSWORD,database:process.env.DB_NAME});
  let server,fallo;
  const conexion={beginTransaction:()=>real.beginTransaction(),query:async(sql,p)=>{
    if(fallo&&sql.includes(fallo)){const e=new Error('Fallo inyectado');if(fallo==='duplicado')e.code='ER_DUP_ENTRY';throw e;}
    if(fallo==='duplicado'&&sql.includes('INSERT INTO cierre_pagos'))throw Object.assign(new Error('Carrera inyectada'),{code:'ER_DUP_ENTRY'});
    return real.query(sql,p);
  },commit:async()=>{if(fallo==='commit')throw new Error('Commit fallido');await real.commit();},rollback:()=>real.rollback(),end:async()=>{}};
  try{
    for(const tabla of ['pagos','usuarios','cierres_caja','reportes_generados','cierre_pagos']){
      await real.query(`CREATE TEMPORARY TABLE copia_cierres_${tabla} LIKE ${tabla}`);await real.query(`CREATE TEMPORARY TABLE ${tabla} LIKE copia_cierres_${tabla}`);
    }
    const [columns]=await real.query('SHOW COLUMNS FROM pagos');assert.ok(columns.some(c=>c.Field==='verificado_en'),'Requiere v2.29');
    await real.query("INSERT INTO usuarios (id,nombre,email,password_hash,estado,roles_id) VALUES ('u1','Responsable','cierres@example.invalid','fixture','activo',1)");
    const load=(archivo,dependencias)=>{const m={exports:{}};vm.runInNewContext(fs.readFileSync(path.join(__dirname,archivo),'utf8'),{module:m,exports:m.exports,console:{error(){}},require:n=>Object.hasOwn(dependencias,n)?dependencias[n]:require(n)});return m.exports;};
    const servicio=load('../src/services/cierresCajaService.js',{'mysql2':{createConnection:()=>({promise:()=>conexion})},'../config/db':{dbConfig:{}},'./liquidacionService':require('../src/services/liquidacionService')});
    const controlador=load('../src/controllers/cierresCajaController.js',{'../services/cierresCajaService':servicio});
    const rutas=load('../src/routes/cierresCajaRoutes.js',{'../controllers/cierresCajaController':controlador});
    const express=require('express'),app=express();app.use(express.json());app.use('/api/cierres-caja',rutas);
    server=await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s));});
    const base=`http://127.0.0.1:${server.address().port}/api/cierres-caja`;
    const req=async(ruta='',method='GET',b)=>{const r=await fetch(base+ruta,{method,headers:{'Content-Type':'application/json'},body:b===undefined?undefined:JSON.stringify(b)});return {status:r.status,data:await r.json()};};
    const body={fecha_inicio:'2026-10-01T00:00:00',fecha_fin:'2026-10-02T00:00:00',total_efectivo_real:'11.00',usuarios_id:'u1'};
    const query='?fecha_inicio=2026-10-01T00:00:00&fecha_fin=2026-10-02T00:00:00';
    const pago=async(id,metodo='efectivo',importe='10.25',estado='pagado',verificacion='verificado',fecha='2026-10-01 12:00:00')=>real.query(`INSERT INTO pagos (id,metodo_de_pago,total_seleccionado,estado,verificacion_estado,creado_en,verificado_en,pedidos_id,usuarios_id)
      VALUES (?,?,?,?,?,'2026-09-01',?,'pedido-parcial','u1')`,[id,metodo,importe,estado,verificacion,fecha]);
    const reset=async()=>{fallo=null;for(const tabla of ['cierre_pagos','cierres_caja','reportes_generados','pagos'])await real.query(`DELETE FROM ${tabla}`);};
    const conteo=async()=>{const [[r]]=await real.query('SELECT (SELECT COUNT(*) FROM cierres_caja) AS c,(SELECT COUNT(*) FROM reportes_generados) AS r,(SELECT COUNT(*) FROM cierre_pagos) AS p');return [r.c,r.r,r.p];};
    await t.test('resumen vacio, sin escrituras y cierre vacio rechazado',async()=>{
      const r=await req('/resumen'+query);assert.equal(r.status,200);assert.equal(r.data.cantidad_pagos,0);assert.equal(r.data.total_general,'0.00');assert.equal(r.data.efectivo_esperado,'0.00');
      assert.equal((await req('','POST',body)).status,409);assert.deepEqual(await conteo(),[0,0,0]);
    });
    await t.test('seleccion exacta, limites de periodo, historicos y metodos',async()=>{
      await reset();await pago('cash');await pago('nequi','nequi','0.50');await pago('davi','daviplata','1.00');await pago('card','tarjeta','2.00');
      await pago('pend','efectivo','99','pendiente','pendiente');await pago('rech','efectivo','99','cancelado','rechazado');await pago('cancel','efectivo','99','cancelado','verificado');
      await pago('antes','efectivo','99','pagado','verificado','2026-09-30 23:59:59');await pago('fin','efectivo','99','pagado','verificado','2026-10-02 00:00:00');await pago('hist','efectivo','99','pagado','verificado',null);
      const r=(await req('/resumen'+query)).data;assert.equal(r.cantidad_pagos,4);assert.equal(r.efectivo_esperado,'10.25');assert.equal(r.total_general,'13.75');assert.deepEqual(r.por_metodo,{efectivo:'10.25',nequi:'0.50',daviplata:'1.00',tarjeta:'2.00'});
      assert.deepEqual(await conteo(),[0,0,0]);
    });
    for(const [contado,diferencia]of [['11.00','0.75'],['9.00','-1.25']])await t.test(`cierre snapshot y diferencia ${diferencia}`,async()=>{
      await reset();await pago('cash');await pago('nequi','nequi','0.50');
      const r=await req('','POST',{...body,total_efectivo_real:contado});assert.equal(r.status,201,JSON.stringify(r.data));const c=r.data.cierre;
      assert.equal(c.diferencia_efectivo,diferencia);assert.equal(c.total_general,'10.75');assert.equal(c.pagos.length,2);assert.equal(c.pagos[0].importe,'10.25');assert.equal(c.pagos[0].metodo_de_pago,'efectivo');
      assert.equal(c.reporte.tipo,'diario');assert.equal(c.reporte.fecha_inicio,'2026-10-01');assert.equal(c.reporte.fecha_fin,'2026-10-02');assert.equal(c.reporte.creado_en,c.fecha);
      assert.ok(c.pagos.every(p=>p.incluido_en===c.fecha));assert.equal(c.reporte.datos_json.total_general,c.total_general);
      assert.deepEqual(await conteo(),[1,1,2]);assert.equal((await req('/resumen'+query)).data.cantidad_pagos,0);assert.equal((await req('','POST',body)).status,409);
      await real.query("UPDATE pagos SET total_seleccionado=99,metodo_de_pago='tarjeta'");
      assert.deepEqual((await req('/'+c.id)).data.cierre,c);
      assert.equal((await req('?usuarios_id=u1')).data.total,1);assert.equal((await req('?usuarios_id=otro')).data.total,0);
      assert.equal((await req('?fecha_inicio=2000-01-01T00:00:00&fecha_fin=9999-01-01T00:00:00')).data.total,1);
      assert.equal((await req('?fecha_fin=2000-01-01T00:00:00')).data.total,0);
      assert.deepEqual((await req('?pagina=2&limite=1')).data.datos,[]);
    });
    for(const tipo of ['INSERT INTO reportes_generados','INSERT INTO cierres_caja','INSERT INTO cierre_pagos','commit','duplicado'])await t.test(`rollback ${tipo}`,async()=>{
      await reset();await pago('cash');fallo=tipo;assert.equal((await req('','POST',body)).status,tipo==='duplicado'?409:500);assert.deepEqual(await conteo(),[0,0,0]);
    });
    await t.test('overflow de sumas antes de insertar',async()=>{
      await reset();await pago('max','efectivo','9999999999.99');await pago('centavo','efectivo','0.01');assert.equal((await req('','POST',body)).status,409);assert.deepEqual(await conteo(),[0,0,0]);
    });
    await t.test('fechas, decimales, usuario y paginacion invalidos',async()=>{
      await reset();await pago('cash');
      for(const b of [{...body,fecha_inicio:'2026-02-30T00:00:00'},{...body,fecha_fin:body.fecha_inicio},{...body,fecha_inicio:'2026-10-01T00:00:00Z'},...[-1,'1.001',true,null,'1e3','10000000000'].map(v=>({...body,total_efectivo_real:v})),{...body,extra:1}])assert.equal((await req('','POST',b)).status,400);
      assert.equal((await req('','POST',{...body,usuarios_id:'no-existe'})).status,404);
      assert.equal((await req('/no-existe')).status,404);assert.equal((await req('/resumen')).status,400);
      for(const q of ['limite=101','pagina=0','fecha_inicio=mal'])assert.equal((await req('?'+q)).status,400);
      assert.deepEqual(await conteo(),[0,0,0]);
    });
    await t.test('inicio incluido, efectivo real cero y listado vacio',async()=>{
      await reset();assert.equal((await req()).data.total,0);await pago('inicio','efectivo','0.01','pagado','verificado','2026-10-01 00:00:00');
      const r=await req('','POST',{...body,total_efectivo_real:'0'});assert.equal(r.status,201);assert.equal(r.data.cierre.diferencia_efectivo,'-0.01');
    });
  }finally{if(server)await new Promise(resolve=>server.close(resolve));await real.end();}
});
