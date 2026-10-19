const test=require('node:test'),assert=require('node:assert/strict');
const {fechaBogota,fechaLocalSQL}=require('../src/utils/fechaHora');
test('Conversión central de Bogotá conserva medianoche y fin del día sin depender de Node',()=>{
  const old=process.env.TZ;
  try{for(const zone of ['UTC','Asia/Tokyo','America/Bogota']){
    process.env.TZ=zone;
    assert.equal(fechaBogota(new Date('2026-10-19T05:05:00Z')),'2026-10-19 00:05:00');
    assert.equal(fechaBogota(new Date('2026-10-20T04:55:00Z')),'2026-10-19 23:55:00');
  }}finally{if(old===undefined)delete process.env.TZ;else process.env.TZ=old;}
  assert.throws(()=>fechaLocalSQL('fecha;DROP TABLE pagos'));
});

test('MariaDB: pagos 00:05/23:55, historia, rondas, división y cierre conservan sus instantes',{
  skip:process.env.RUN_MYSQL_FECHAS_BOGOTA_TESTS!=='1',timeout:60000
},async t=>{
  const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
  const {createRequire}=require('node:module');
  const sandbox=await require('./helpers/comprasSandbox').crear(),c=sandbox.connection;
  const config={...sandbox.config,timezone:'Z',dateStrings:['DATE']};
  let clock=Date.parse('2026-10-19T05:05:00Z')/1000,server;
  const load=file=>{
    const absolute=path.join(__dirname,'../src',file),sourceRequire=createRequire(absolute),m={exports:{}};
    vm.runInNewContext(fs.readFileSync(absolute,'utf8'),{module:m,exports:m.exports,console:{error(){}},require:n=>{
      if(n==='../config/db')return {dbConfig:config,query:(sql,args,callback)=>{
        if(typeof args==='function'){callback=args;args=[];}
        c.query(sql,args).then(([rows])=>callback(null,rows),callback);
      }};
      if(n==='mysql2')return {createConnection:cfg=>{
        const real=require('mysql2').createConnection(cfg).promise();
        // Simular servidor en otra zona: los eventos y NOW locales deben seguir siendo correctos.
        const ready=real.query("SET time_zone='+09:00'").then(()=>real.query('SET timestamp=?',[clock]));
        return {promise:()=>({query:async(...args)=>{await ready;return real.query(...args);},
          beginTransaction:async()=>{await ready;return real.beginTransaction();},commit:()=>real.commit(),rollback:()=>real.rollback(),end:()=>real.end()})};
      }};
      return sourceRequire(n);
    }});return m.exports;
  };
  try{
    await c.query("INSERT INTO usuarios(id,nombre,email,password_hash,estado,roles_id) VALUES ('u','Actor','fechas@example.invalid','fixture','activo',1)");
    await c.query("INSERT INTO mesas(id,numero,estado,creado_en) VALUES ('m',1,'ocupada','2026-10-19 05:05:00')");
    await c.query("INSERT INTO sesiones_mesa(id,mesas_id,estado,iniciada_en) VALUES ('s','m','activa','2026-10-19 05:05:00')");
    await c.query("INSERT INTO clientes(id,nombre,estado,usuarios_id) VALUES ('cl','Cliente','activo','u'),('cl2','Otro','activo','u')");
    await c.query("INSERT INTO pedidos(id,estado,creado_en,mesas_id,usuarios_id,clientes_id,sesion_mesa_id) VALUES ('p','abierto','2026-10-19 00:05:00','m','u','cl','s')");
    await c.query("INSERT INTO productos(id,nombre,codigo,precio_venta,costo_promedio_ponderado,cantidad_disponible,stock_minimo,estado,categorias_id,proveedores_id) VALUES ('pr','Producto','FECHA',100.50,0,50,1,'activo',1,'prov')");
    await c.query("INSERT INTO pedido_items(id,precio_unitario,pedido_id,producto_id,cantidad_pedida,cantidad_pagada,estado,pedidos_id,productos_id) VALUES ('i',100.50,'p','pr',1,0,'servido','p','pr')");
    await c.query("INSERT INTO mesas(id,numero,estado,creado_en) VALUES ('mr',2,'ocupada','2026-10-19 05:05:00')");
    await c.query("INSERT INTO sesiones_mesa(id,mesas_id,estado,iniciada_en) VALUES ('sr','mr','activa','2026-10-19 05:05:00')");
    await c.query("INSERT INTO pedidos(id,estado,creado_en,mesas_id,usuarios_id,sesion_mesa_id) VALUES ('pronda','abierto','2026-10-19 00:05:00','mr','u','sr')");
    await c.query("INSERT INTO jugadores(id,nombre,mesas_id,tipo_participante,sesion_mesa_id) VALUES ('persona-ronda','Temporal','mr','temporal','sr')");
    await c.query("INSERT INTO sesiones_division_cuentas(id,modalidad,mesas_id,usuarios_id,sesion_mesa_id,pedido_id,estado,total_objetivo,total_cuenta_base,creado_en) VALUES ('d','equitativa','m','u','s','p','activa',100.50,100.50,'2026-10-19 00:05:00')");
    for(const who of ['a','b']){
      await c.query("INSERT INTO jugadores(id,nombre,mesas_id,tipo_participante,sesion_mesa_id,clientes_id) VALUES (?,?,'m','registrado','s',?)",[who,who,who==='a'?'cl':'cl2']);
      await c.query("INSERT INTO division_participantes(id,sesion_division_id,jugadores_id,nombre_cliente,total_asignado,creado_en) VALUES (?,'d',?,?,50.25,'2026-10-19 00:05:00')",[who,who,who]);
    }
    const pagos=load('controllers/pagosController.js'),pedidos=load('controllers/pedidosController.js');
    const clientes=load('controllers/clientesController.js'),rondas=load('controllers/rondasConsumoController.js');
    const division=load('controllers/divisionesController.js'),cierres=load('services/cierresCajaService.js');
    const express=require('express'),app=express();app.use(express.json());
    app.use((req,res,next)=>{req.usuario={id:'u',rol:'Administrador'};next();});
    app.post('/pagos',pagos.registrarPago);app.patch('/pagos/:id/verificar',pagos.verificarPago);
    app.get('/pedidos/:id',pedidos.obtenerPedidoConDetalles);
    app.get('/clientes/:id/historial',clientes.historialCliente);
    app.get('/pedidos/:pedido_id/rondas',rondas.listar);
    app.post('/pedidos/:pedido_id/rondas',rondas.confirmar);
    app.get('/divisiones/:id',division.obtenerResumenDivision);
    server=app.listen(0,'127.0.0.1');await require('node:events').once(server,'listening');
    const url='http://127.0.0.1:'+server.address().port;
    const http=async(route,method='GET',body)=>{const r=await fetch(url+route,{method,headers:{'Content-Type':'application/json','Idempotency-Key':'fecha-'+clock},body:body&&JSON.stringify(body)});const data=await r.json();assert.ok(r.ok,JSON.stringify({route,status:r.status,data}));return data;};
    for(const [who,utc,local]of [['a','2026-10-19T05:05:00Z','2026-10-19 00:05:00'],['b','2026-10-20T04:55:00Z','2026-10-19 23:55:00']]){
      clock=Date.parse(utc)/1000;
      const stock=(await c.query("SELECT cantidad_disponible n FROM productos WHERE id='pr'"))[0][0].n;
      const pay=await http('/pagos','POST',{id:'pay-'+who,pedidos_id:'p',sesion_division_id:'d',participante_id:who,metodo_de_pago:'efectivo',total_seleccionado:'50.25'});
      await http('/pagos/'+pay.id_pago+'/verificar','PATCH',{verificacion_estado:'verificado'});
      const [[raw]]=await c.query("SELECT CAST(creado_en AS CHAR) local,DATE_FORMAT(verificado_en,'%Y-%m-%dT%H:%i:%sZ') utc FROM pagos WHERE id=?",[pay.id_pago]);
      assert.equal(raw.local,local);assert.equal(raw.utc,utc);
      assert.equal((await c.query("SELECT cantidad_disponible n FROM productos WHERE id='pr'"))[0][0].n,stock);
      const ronda=await http('/pedidos/pronda/rondas','POST',{items:[{participante_id:'persona-ronda',productos_id:'pr',cantidad:1}]});
      assert.equal(ronda.datos.creada_en,utc);
    }
    // Nueva conexión: la serialización no puede depender de la zona del proceso.
    const read=await require('mysql2/promise').createConnection(config);
    try{
      const lista=await require('../src/services/pagosLecturaService').listar(read,{desde:'2026-10-19',hasta:'2026-10-19',estado:'verificado'});
      assert.equal(lista.resumen.total_verificado,'100.50');assert.equal(lista.resumen.verificados,2);
      assert.deepEqual(lista.datos.map(p=>p.creado_en).sort(),['2026-10-19T05:05:00Z','2026-10-20T04:55:00Z']);
      const siguiente=await require('../src/services/pagosLecturaService').listar(read,{desde:'2026-10-20',hasta:'2026-10-20'});
      assert.equal(siguiente.resumen.verificados,0);
    }finally{await read.end();}
    for(let reload=0;reload<2;reload++){
      assert.equal((await http('/pedidos/p')).datos.creado_en,'2026-10-19T05:05:00Z');
      assert.equal((await http('/clientes/cl/historial')).datos[0].fecha,'2026-10-19T05:05:00Z');
      assert.deepEqual((await http('/pedidos/pronda/rondas')).datos.map(r=>r.creada_en),['2026-10-19T05:05:00Z','2026-10-20T04:55:00Z']);
      const d=(await http('/divisiones/d')).data;
      assert.equal(d.sesion.creado_en,'2026-10-19T05:05:00Z');assert.equal(d.total_pagado,'100.50');assert.equal(d.estado,'completada');
    }
    const body={fecha_inicio:'2026-10-19T05:00:00',fecha_fin:'2026-10-20T05:00:00',total_efectivo_real:'100.50'};
    await c.beginTransaction();
    let result;try{result=await cierres.crear(c,body,'u');await c.commit();}catch(e){await c.rollback();throw e;}
    assert.equal(result.status,201);assert.equal(result.body.cierre.total_general,'100.50');
    assert.equal(result.body.cierre.fecha_inicio,'2026-10-19T05:00:00Z');
    assert.equal(result.body.cierre.fecha_fin,'2026-10-20T05:00:00Z');
    const reread=await cierres.detalle(c,result.body.cierre.id);
    assert.equal(reread.pagos.length,2);
    assert.equal((await c.query("SELECT CAST(creado_en AS CHAR) fecha FROM pedidos WHERE id='p'"))[0][0].fecha,'2026-10-19 00:05:00');
    assert.equal((await c.query("SELECT cantidad_disponible stock FROM productos WHERE id='pr'"))[0][0].stock,48);
    t.diagnostic('Dos pagos del día Bogotá; historia y rondas sin desfase; recarga idéntica; división y cierre 100.50; ningún timestamp histórico reescrito.');
  }finally{
    if(server){server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
    await sandbox.close();
  }
});
