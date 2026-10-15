const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const liquidacion=require('../src/services/liquidacionService');

test('Comprobantes: HTTP y MySQL real con tablas temporales', {skip:process.env.RUN_MYSQL_COMPROBANTES_TESTS!=='1'},async t=>{
  require('dotenv').config({path:path.join(__dirname,'../.env'),quiet:true});
  const real=await require('mysql2/promise').createConnection({host:process.env.DB_HOST,port:process.env.DB_PORT,user:process.env.DB_USER,password:process.env.DB_PASSWORD,database:process.env.DB_NAME});
  let server,fallo,cola=Promise.resolve(),descuadre=false;
  let actor='u1';
  // Las tablas temporales no pueden compartirse entre conexiones. Serializar exclusivamente
  // el arnés permite solicitudes HTTP simultáneas sin mezclar transacciones en esta conexión.
  const crearConexion=()=>{
    let liberar,adquirida;
    const adquirir=()=>adquirida||(adquirida=(async()=>{const anterior=cola;cola=new Promise(r=>{liberar=r;});await anterior;})());
    return {beginTransaction:async()=>{await adquirir();await real.beginTransaction();},
      query:async(sql,params)=>{
        await adquirir();
        if(fallo && sql.includes(fallo)) throw new Error('Fallo SQL inyectado');
        if(descuadre && sql.includes('pr.nombre AS descripcion')) {
          const [r,meta]=await real.query(sql,params);r[0].cantidad++;return [r,meta];
        }
        // La emisión no tiene permiso para escribir en las entidades de cobro/consumo.
        if(/\b(UPDATE|DELETE)\b/i.test(sql.replace(/FOR UPDATE/g,'')) || /INSERT INTO (?!comprobantes\b|comprobante_items\b)/i.test(sql)) throw new Error('Escritura ajena a comprobantes');
        return real.query(sql,params);
      },commit:async()=>{if(fallo==='commit')throw new Error('Fallo commit');await real.commit();},
      rollback:()=>real.rollback(),end:async()=>{if(liberar)liberar();}};
  };
  try{
    for(const tabla of ['comprobantes','comprobante_items','mesas','pedidos','pedido_items','pagos','sesiones_juego','clientes','usuarios','productos','activos_juego']){
      await real.query(`CREATE TEMPORARY TABLE copia_comprobantes_${tabla} LIKE ${tabla}`);
      await real.query(`CREATE TEMPORARY TABLE ${tabla} LIKE copia_comprobantes_${tabla}`);
    }
    await real.query("INSERT INTO usuarios (id,nombre,email,password_hash,estado,roles_id) VALUES ('u1','Emisor','comprobante@example.invalid','fixture','activo',1)");
    await real.query("INSERT INTO clientes (id,nombre,estado,usuarios_id) VALUES ('c1','Cliente Original','activo','u1')");
    await real.query("INSERT INTO mesas (id,numero,estado) VALUES ('m1',991,'disponible')");
    await real.query(`INSERT INTO productos (id,nombre,codigo,precio_venta,costo_promedio_ponderado,cantidad_disponible,stock_minimo,estado,categorias_id,proveedores_id,historial_costos_id)
      VALUES ('pr1','Producto Original','COMP-TEST',999,1,10,0,'activo',1,'prov','hist')`);
    await real.query("INSERT INTO activos_juego (id,nombre,estado,tipo,precio_hora) VALUES ('a1','Billar Original','disponible','billar',999)");
    const reset=async()=>{
      fallo=null;descuadre=false;
      for(const tabla of ['comprobante_items','comprobantes','sesiones_juego','pagos','pedido_items','pedidos'])await real.query(`DELETE FROM ${tabla}`);
      await real.query("UPDATE clientes SET nombre='Cliente Original'");
      await real.query("UPDATE productos SET nombre='Producto Original'");
      await real.query(`INSERT INTO pedidos (id,estado,creado_en,mesas_id,usuarios_id,clientes_id,total_general)
        VALUES ('p1','cerrado',UTC_TIMESTAMP(),'m1','u1','c1',999)`);
      await real.query(`INSERT INTO pedido_items (id,precio_unitario,pedido_id,producto_id,cantidad_pedida,cantidad_pagada,estado,pedidos_id,productos_id)
        VALUES ('i1',10.25,'p1','pr1',2,2,'servido','p1','pr1'),('i2',100,'p1','pr1',1,0,'cancelado','p1','pr1')`);
      await real.query(`INSERT INTO sesiones_juego (id,tipo_juego,costo_total,estado,activos_juego_id,mesas_id,iniciada_por,cerrada_por,pedido_items_id)
        VALUES ('s1','billar',0.51,'cerrada','a1','m1','u1','u1','i1'),
        ('s2','billar',100,'cancelada','a1','m1','u1','u1','i1'),
        ('s3','billar',100,'cerrada','a1','m1','u1','u1','i2')`);
      await real.query(`INSERT INTO pagos (id,metodo_de_pago,total_seleccionado,verificacion_estado,estado,creado_en,pedidos_id,usuarios_id)
        VALUES ('pa1','efectivo',21.01,'verificado','pagado',UTC_TIMESTAMP(),'p1','u1')`);
    };
    const servicio={exports:{}};
    vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../src/services/comprobantesService.js'),'utf8'),{
      module:servicio,console:{error(){}},require:n=>n==='./juegosPedidoService'?require('../src/services/juegosPedidoService'):n==='../config/db'?{dbConfig:{}}:n==='mysql2'?{createConnection:()=>({promise:crearConexion})}:n==='./liquidacionService'?liquidacion:(n === '../services/identidadService' ? require('../src/services/identidadService') : n === '../middleware/rolesMiddleware' ? require('../src/middleware/rolesMiddleware') : require(n))
    });
    const controlador={exports:{}};
    vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../src/controllers/ventasController.js'),'utf8'),{
      module:controlador,exports:controlador.exports,require:n=>n==='../services/comprobantesService'?servicio.exports:(n === '../services/identidadService' ? require('../src/services/identidadService') : n === '../middleware/rolesMiddleware' ? require('../src/middleware/rolesMiddleware') : require(n))
    });
    const rutas={exports:{}};
    vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../src/routes/ventasRoutes.js'),'utf8'),{
      module:rutas,require:n=>n==='../controllers/ventasController'?controlador.exports:(n === '../services/identidadService' ? require('../src/services/identidadService') : n === '../middleware/rolesMiddleware' ? require('../src/middleware/rolesMiddleware') : require(n))
    });
    const express=require('express'),app=express();app.use(express.json()); app.use((req,res,next)=>{req.usuario={id:actor,rol:'Administrador'};next();});app.use('/api/ventas',rutas.exports);
    server=await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s));});
    const base=`http://127.0.0.1:${server.address().port}/api/ventas`;
    const req=async(ruta,method='GET',body)=>{const r=await fetch(base+ruta,{method,headers:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});return {status:r.status,data:await r.json()};};
    const body={pedido_id:'p1'};
    const emitir=()=>req('/facturar','POST',body);
    const conteo=async()=>{const [[c]]=await real.query('SELECT COUNT(*) AS n FROM comprobantes');const [[i]]=await real.query('SELECT COUNT(*) AS n FROM comprobante_items');return [c.n,i.n];};
    for(const [campo,valor]of [['pedido_id','no-existe']])await t.test(`${campo} inexistente`,async()=>{await reset();assert.equal((await req('/facturar','POST',{...body,[campo]:valor})).status,404);});
    for(const estado of ['abierto','cancelado'])await t.test(`pedido ${estado}`,async()=>{await reset();await real.query('UPDATE pedidos SET estado=?',[estado]);assert.equal((await emitir()).status,409);});
    await t.test('cerrado con deuda o pago pendiente',async()=>{
      await reset();await real.query('UPDATE pagos SET total_seleccionado=20');assert.equal((await emitir()).status,409);
      await real.query("UPDATE pagos SET total_seleccionado=21.01,estado='pendiente',verificacion_estado='pendiente'");assert.equal((await emitir()).status,409);
      assert.deepEqual(await conteo(),[0,0]);
    });
    await t.test('juego activo o sin costo definitivo',async()=>{
      await reset();await real.query("UPDATE sesiones_juego SET estado='activa' WHERE id='s1'");assert.equal((await emitir()).status,409);
      await real.query("UPDATE sesiones_juego SET estado='cerrada',costo_total=NULL WHERE id='s1'");
      await real.query('UPDATE pagos SET total_seleccionado=20.50');assert.equal((await emitir()).status,409);
    });
    await t.test('snapshot exacto, exclusiones, nombres congelados, no modifica consumos',async()=>{
      await reset();const r=await emitir();assert.equal(r.status,201,JSON.stringify(r.data));const c=r.data.comprobante;
      assert.equal(c.usuarios_id,actor);assert.equal(c.total_productos,'20.50');assert.equal(c.total_juegos,'0.51');assert.equal(c.total_general,'21.01');assert.equal(c.total_pagado,'21.01');
      assert.equal(c.items.length,2);assert.equal(c.items[0].referencia_id,'i1');assert.equal(c.items[0].descripcion,'Producto Original');assert.equal(c.items[0].cantidad,2);assert.equal(c.items[0].precio_unitario,'10.25');
      assert.equal(c.items[1].referencia_id,'s1');assert.equal(c.items[1].descripcion,'Billar Original');assert.equal(c.items[1].subtotal,'0.51');
      assert.equal(c.items.reduce((a,i)=>a+liquidacion.centavos(i.subtotal),0n),liquidacion.centavos(c.total_general));
      assert.match(c.emitido_en,/Z$/);assert.equal(typeof c.numero,'string');
      await real.query("UPDATE clientes SET nombre='Nuevo Cliente'");await real.query("UPDATE productos SET nombre='Nuevo Producto',precio_venta=1");await real.query("UPDATE activos_juego SET nombre='Nuevo Billar',precio_hora=1");
      assert.deepEqual((await req(`/comprobantes/${c.id}`)).data.comprobante,c);
      const repetido=await emitir();assert.equal(repetido.status,409);assert.equal(repetido.data.comprobante.id,c.id);assert.equal(repetido.data.comprobante.numero,c.numero);
      const [[p]]=await real.query('SELECT total_general,estado FROM pedidos');assert.equal(p.total_general,'999.00');assert.equal(p.estado,'cerrado');
      const [[pr]]=await real.query('SELECT cantidad_disponible FROM productos');assert.equal(pr.cantidad_disponible,10);
      const [[pagos]]=await real.query('SELECT COUNT(*) AS n FROM pagos');assert.equal(pagos.n,1);
    });
    await t.test('solicitudes HTTP simultaneas serializadas por arnes temporal: un comprobante',async()=>{
      await reset();const r=await Promise.all([emitir(),emitir()]);assert.deepEqual(r.map(x=>x.status).sort(),[201,409]);assert.deepEqual(await conteo(),[1,2]);
      // También comprobar que MySQL conserva y aplica la UNIQUE real al clonar.
      await assert.rejects(real.query(`INSERT INTO comprobantes (id,pedidos_id,clientes_id,cliente_nombre,usuarios_id,emitido_en,total_productos,total_juegos,total_general,total_pagado)
        VALUES ('duplicado','p1','c1','Cliente','u1',UTC_TIMESTAMP(),20.50,0.51,21.01,21.01)`),e=>e.code==='ER_DUP_ENTRY');
    });
    for(const tipo of ['INSERT INTO comprobante_items','commit'])await t.test(`rollback ${tipo}`,async()=>{await reset();fallo=tipo;assert.equal((await emitir()).status,500);assert.deepEqual(await conteo(),[0,0]);});
    await t.test('descuadre de snapshot provoca 409 y rollback',async()=>{await reset();descuadre=true;assert.equal((await emitir()).status,409);assert.deepEqual(await conteo(),[0,0]);});
    await t.test('listado vacio, filtros, paginacion, detalle y 404',async()=>{
      await reset();assert.equal((await req('/comprobantes')).data.total,0);const r=await emitir();
      assert.equal((await req('/comprobantes')).data.total,1);
      for(const q of ['pedido_id=p1','cliente_id=c1','pedido_id=p1&cliente_id=c1'])assert.equal((await req(`/comprobantes?${q}`)).data.total,1);
      assert.equal((await req('/comprobantes?cliente_id=otro')).data.total,0);
      const pag=await req('/comprobantes?pagina=2&limite=1');assert.equal(pag.data.total,1);assert.deepEqual(pag.data.datos,[]);
      assert.equal((await req(`/comprobantes/${r.data.comprobante.id}`)).status,200);assert.equal((await req('/comprobantes/no-existe')).status,404);
      for(const q of ['limite=101','pagina=0','limite=1.5','pedido_id='])assert.equal((await req(`/comprobantes?${q}`)).status,400);
    });
    await t.test('9B consulta por pedido, elegibilidad real, temporal, abierto y documento existente',async()=>{
      await reset();let r=await req('/comprobantes/pedido/p1');assert.equal(r.status,200,JSON.stringify(r));assert.equal(r.data.puede_generar,true);assert.equal(r.data.comprobante,null);assert.equal(r.data.mesa_numero,991);
      await real.query("UPDATE pedidos SET clientes_id=NULL");r=await req('/comprobantes/pedido/p1');assert.equal(r.data.puede_generar,false);assert.match(r.data.motivo,/cliente registrado/);assert.equal((await emitir()).status,409);assert.deepEqual(await conteo(),[0,0]);
      await real.query("UPDATE pedidos SET clientes_id='c1',estado='abierto'");r=await req('/comprobantes/pedido/p1');assert.equal(r.data.puede_generar,false);assert.match(r.data.motivo,/cerrado/);
      await real.query("UPDATE pedidos SET estado='cerrado'");await real.query('UPDATE pagos SET total_seleccionado=20');assert.equal((await req('/comprobantes/pedido/p1')).data.puede_generar,false);
      await reset();const emitted=await emitir();r=await req('/comprobantes/pedido/p1');assert.equal(r.data.comprobante.id,emitted.data.comprobante.id);assert.equal(r.data.puede_generar,false);assert.equal((await req('/comprobantes/pedido/inexistente')).status,404);
    });
    await t.test('body restringido y campos obligatorios',async()=>{
      await reset();for(const b of [{},{...body,usuarios_id:'u2'},{...body,metodo_pago:'efectivo'},{...body,total:21.01},{...body,numero:1},{...body,cliente:'c1'}])assert.equal((await req('/facturar','POST',b)).status,400);
    });
  }finally{if(server)await new Promise(resolve=>server.close(resolve));await real.end();}
});
