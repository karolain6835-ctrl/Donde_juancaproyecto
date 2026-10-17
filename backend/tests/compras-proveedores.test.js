const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const mysql = require('mysql2/promise');
const express = require('express');

test('proveedores y compras por HTTP con MySQL temporal', {
  skip: process.env.RUN_MYSQL_COMPRAS_TESTS !== '1'
}, async t => {
  require('dotenv').config({path:path.join(__dirname,'../.env'),quiet:true});
  const sandbox=await require('./helpers/comprasSandbox').crear();
  const real=sandbox.connection;
  let server, fallo = null, numero = 0, cierres = 0;
  let actor='u1';
  const conexion = {
    beginTransaction:()=>real.beginTransaction(),
    query:async(sql,params)=>{
      const op = sql.startsWith('UPDATE productos') ? 'producto'
        : sql.includes('INSERT INTO movimientos_inventario') ? 'movimiento'
        : sql.startsWith('UPDATE compras') ? 'estado'
        : sql.includes('INSERT INTO compra_items') ? 'item' : null;
      if(op && fallo && fallo.startsWith(op)) {
        numero++;
        if(!fallo.endsWith('-segundo') || numero===2) {
          if(fallo.endsWith('-cero')) return [{affectedRows:0}];
          throw new Error('Fallo inyectado '+fallo);
        }
      }
      return real.query(sql,params);
    },
    commit:async()=>{if(fallo==='commit') throw new Error('Fallo commit'); await real.commit();},
    rollback:()=>real.rollback(),end:async()=>{cierres++;}
  };
  const cargar = (archivo,dependencias={})=>{
    const modulo={exports:{}};
    vm.runInNewContext(fs.readFileSync(path.join(__dirname,'..',archivo),'utf8'),{
      module:modulo,exports:modulo.exports,
      require:n=>Object.hasOwn(dependencias,n) ? dependencias[n] : (n === '../services/identidadService' ? require('../src/services/identidadService') : n === '../middleware/rolesMiddleware' ? require('../src/middleware/rolesMiddleware') : (n === '../services/auditoriaService' ? require('../src/services/auditoriaService') : require(n))),console:{error(){}}
    });
    return modulo.exports;
  };
  try {
    for(const n of ['1','2']) {
      await real.query("INSERT INTO proveedores (id,contacto_nombre,estado) VALUES (?,?,'activo')",['prov'+n,'Proveedor '+n]);
      await real.query("INSERT INTO usuarios (id,nombre,email,password_hash,estado,roles_id) VALUES (?,?,?,'fixture','activo',1)",
        ['u'+n,'Usuario '+n,'compras'+n+'@example.invalid']);
      await real.query(`INSERT INTO productos
        (id,nombre,codigo,precio_venta,costo_promedio_ponderado,cantidad_disponible,stock_minimo,estado,categorias_id,proveedores_id,historial_costos_id)
        VALUES (?,?,?,100,12.34,27,1,'activo',1,'prov1','hist-base')`,['p'+n,'Producto '+n,'COMPRA-'+n]);
    }
    const service=cargar('src/services/comprasService.js',{
      '../config/db':{dbConfig:{}},'mysql2':{createConnection:()=>({promise:()=>conexion})}
    });
    const proveedores=cargar('src/controllers/proveedoresController.js',{'../services/comprasService':service});
    const recepciones=cargar('src/services/recepcionesCompraService.js',{'./comprasService':service,'./auditoriaService':require('../src/services/auditoriaService')});
    const compras=cargar('src/controllers/comprasController.js',{'../services/comprasService':service,'../services/recepcionesCompraService':recepciones});
    const app=express();app.use(express.json()); app.use((req,res,next)=>{req.usuario={id:actor,rol:'Administrador'};next();});
    app.use('/api/proveedores',cargar('src/routes/proveedoresRoutes.js',{'../controllers/proveedoresController':proveedores}));
    app.use('/api/compras',cargar('src/routes/comprasRoutes.js',{'../controllers/comprasController':compras}));
    server=await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s));});
    const base=`http://127.0.0.1:${server.address().port}/api`;
    const request=async(ruta,method='GET',body)=>{
      const r=await fetch(base+ruta,{method,headers:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
      return {status:r.status,data:await r.json()};
    };
    const datos={proveedores_id:'prov1',items:[
      {productos_id:'p1',cantidad:5,precio_unitario:2800},
      {productos_id:'p2',cantidad:3,precio_unitario:0.10}
    ]};
    const crear=(body=datos)=>request('/compras','POST',body);
    const recibir=async id=>{const anterior=actor;actor='u2';try{return await request('/compras/'+id+'/recibir','PATCH');}finally{actor=anterior;}};
    const cancelar=id=>request('/compras/'+id+'/cancelar','PATCH');
    const preparar=async()=>{
      fallo=null;numero=0;
      for(const tabla of ['historial_costos_recepciones','recepcion_compra_items','recepciones_compra','movimientos_inventario','compra_items','compras']) await real.query(`DELETE FROM ${tabla}`);
      await real.query('UPDATE productos SET cantidad_disponible=27');
      await real.query("UPDATE proveedores SET estado='activo'");
    };
    const estado=async()=>{
      const [p]=await real.query('SELECT id,cantidad_disponible,costo_promedio_ponderado,historial_costos_id FROM productos ORDER BY id');
      const [[mi]]=await real.query('SELECT COUNT(*) AS n FROM movimientos_inventario');
      return {productos:p,movimientos:mi.n};
    };
    await t.test('crear, listar y actualizar proveedor sin perder campos omitidos',async()=>{
      const r=await request('/proveedores','POST',{contacto_nombre:'Contacto',telefono:'3001234567',email:'test@example.invalid'});
      assert.equal(r.status,201);assert.equal(r.data.datos.estado,'activo');
      const id=r.data.datos.id;
      let u=await request('/proveedores/'+id,'PUT',{estado:'inactivo'});
      assert.equal(u.status,200);assert.equal(u.data.datos.telefono,'3001234567');
      u=await request('/proveedores/'+id,'PUT',{estado:'inactivo'});assert.equal(u.status,200);
      const lista=await request('/proveedores');assert.ok(lista.data.datos.some(p=>p.id===id));
      assert.deepEqual(Object.keys(r.data.datos).sort(),['id','telefono','email','contacto_nombre','estado'].sort());
    });
    await t.test('proveedor invalido y proveedor no encontrado',async()=>{
      for(const body of [{estado:'bloqueado'},{estado:1},{telefono:123},{email:'x'.repeat(151)},{nombre_comercial:'No existe'},{}]) {
        assert.equal((await request('/proveedores','POST',body)).status,400);
      }
      assert.equal((await request('/proveedores/inexistente','PUT',{estado:'activo'})).status,404);
    });
    await t.test('crear pendiente, total decimal exacto, cabecera y detalle sin inventario ni costos',async()=>{
      await preparar();const antes=await estado();const r=await crear();assert.equal(r.status,201);
      assert.equal(r.data.datos.estado,'pendiente');assert.equal(r.data.datos.total_estimado,'14000.30');
      assert.equal(r.data.datos.total_recibido,'0.00');assert.match(r.data.datos.creado_en,/Z$/);
      assert.deepEqual(await estado(),antes);
      const d=await request('/compras/'+r.data.datos.id);assert.equal(d.status,200);
      assert.equal(d.data.datos.items.length,2);assert.equal(d.data.datos.items[1].precio_unitario,'0.10');
      assert.equal((await request('/compras/inexistente')).status,404);
    });
    await t.test('rechazar duplicados, cantidades, precios, referencias e inactivo',async()=>{
      await preparar();
      assert.equal((await crear({...datos,items:[datos.items[0],datos.items[0]]})).status,400);
      assert.equal((await crear({...datos,items:[datos.items[0],{...datos.items[0],productos_id:'P1'}]})).status,400);
      for(const cantidad of [null,0,-1,1.5,'5',true,2147483648]) {
        assert.equal((await crear({...datos,items:[{...datos.items[0],cantidad}]})).status,400);
      }
      for(const precio_unitario of [null,-1,'2800',true,1.001,100000000]) {
        assert.equal((await crear({...datos,items:[{...datos.items[0],precio_unitario}]})).status,400);
      }
      assert.equal((await crear({...datos,items:[]})).status,400);
      assert.equal((await crear({...datos,proveedores_id:'inexistente'})).status,404);
      assert.equal((await crear({...datos,usuarios_id:'inexistente'})).status,400);
      assert.equal((await crear({...datos,items:[{...datos.items[0],productos_id:'inexistente'}]})).status,404);
      await real.query("UPDATE proveedores SET estado='inactivo' WHERE id='prov1'");
      assert.equal((await crear()).status,400);
      const [[c]]=await real.query('SELECT COUNT(*) AS n FROM compras');assert.equal(c.n,0);
    });
    await t.test('precio cero y total fuera de rango',async()=>{
      await preparar();let r=await crear({...datos,items:[{...datos.items[0],precio_unitario:0}]});
      assert.equal(r.status,201);assert.equal(r.data.datos.total_estimado,'0.00');
      r=await crear({...datos,items:[{...datos.items[0],precio_unitario:99999999.99}]});assert.equal(r.status,400);
    });
    await t.test('recepcion, movimientos correctos, costos intactos y segunda recepcion rechazada',async()=>{
      await preparar();const r=await crear();const id=r.data.datos.id;
      const antes=await estado();const recibida=await recibir(id);assert.equal(recibida.status,200);
      assert.equal(recibida.data.datos.usuarios_id,'u1');assert.equal(recibida.data.datos.estado,'recibida');assert.equal(recibida.data.datos.total_recibido,'14000.30');
      const despues=await estado();assert.deepEqual(despues.productos.map(p=>p.cantidad_disponible),[32,30]);
      for(let i=0;i<2;i++) {
        assert.notEqual(despues.productos[i].costo_promedio_ponderado,antes.productos[i].costo_promedio_ponderado);
        assert.equal(despues.productos[i].historial_costos_id,antes.productos[i].historial_costos_id);
      }
      const [mov]=await real.query('SELECT * FROM movimientos_inventario ORDER BY productos_id');
      assert.equal(mov.length,2);
      for(const [i,m] of mov.entries()) {
        assert.equal(m.tipo,'compra');assert.equal(m.referencia_tipo,'compra');assert.equal(m.referencia_id,id);
        assert.equal(m.usuarios_id,'u2');assert.equal(m.cantidad,i===0?5:3);
        assert.equal(m.stock_antes,27);assert.equal(m.stock_despues,i===0?32:30);assert.ok(m.creado_en);
      }
      const [[hist]]=await real.query('SELECT COUNT(*) AS n FROM historial_costos');assert.equal(hist.n,0);
      assert.equal((await recibir(id)).status,409);assert.deepEqual(await estado(),despues);
      assert.equal((await cancelar(id)).status,409);assert.deepEqual(await estado(),despues);
    });
    for(const modo of ['producto','movimiento','producto-segundo','movimiento-segundo','producto-cero','movimiento-cero','estado','estado-cero','commit']) {
      await t.test('rollback recepcion '+modo,async()=>{
        await preparar();const r=await crear();const id=r.data.datos.id;const antes=await estado();
        fallo=modo;numero=0;const conexiones=cierres;
        assert.equal((await recibir(id)).status,500);assert.deepEqual(await estado(),antes);assert.equal(cierres,conexiones+1);
        fallo=null;const d=await request('/compras/'+id);assert.equal(d.data.datos.estado,'pendiente');assert.equal(d.data.datos.total_recibido,'0.00');
      });
    }
    await t.test('fallo de segundo item revierte creacion completa',async()=>{
      await preparar();fallo='item-segundo';assert.equal((await crear()).status,500);
      for(const tabla of ['compras','compra_items']) {const [[c]]=await real.query(`SELECT COUNT(*) AS n FROM ${tabla}`);assert.equal(c.n,0);}
      assert.equal((await estado()).movimientos,0);
    });
    await t.test('cancelar pendiente sin inventario y rechazar recepcion/cancelacion repetida',async()=>{
      await preparar();const r=await crear();const antes=await estado();const id=r.data.datos.id;
      const c=await cancelar(id);assert.equal(c.status,200);assert.equal(c.data.datos.estado,'cancelada');
      assert.deepEqual(await estado(),antes);assert.equal((await cancelar(id)).status,409);assert.equal((await recibir(id)).status,409);
    });
    await t.test('GET filtros, combinacion, paginacion y vacio',async()=>{
      await preparar();const a=await crear();await recibir(a.data.datos.id);
      actor='u2';const b=await crear({...datos,proveedores_id:'prov2'});await cancelar(b.data.datos.id);actor='u1';
      await crear();
      for(const [q,total] of [['',3],['estado=pendiente',1],['proveedores_id=prov1',2],['usuarios_id=u2',1],
        ['estado=recibida&proveedores_id=prov1&usuarios_id=u1',1]]) {
        const r=await request('/compras?'+q);assert.equal(r.status,200);assert.equal(r.data.paginacion.total,total);assert.equal(r.data.datos.length,total);
      }
      // El historial valida que exista el proveedor antes de listar sus compras.
      assert.equal((await request('/compras?proveedores_id=inexistente')).status,404);
      const lista=await request('/compras');const pag=await request('/compras?pagina=2&limite=1');
      assert.deepEqual(pag.data.paginacion,{pagina:2,limite:1,total:3,total_paginas:3});assert.equal(pag.data.datos[0].id,lista.data.datos[1].id);
      for(const q of ['pagina=0','pagina=1.5','limite=101','estado=anulada','usuarios_id=','texto=x','estado=pendiente&estado=recibida']) {
        assert.equal((await request('/compras?'+q)).status,400);
      }
    });
    await t.test('rango inventario y compra inexistente',async()=>{
      await preparar();const r=await crear();await real.query("UPDATE productos SET cantidad_disponible=2147483647 WHERE id='p1'");
      const antes=await estado();assert.equal((await recibir(r.data.datos.id)).status,409);assert.deepEqual(await estado(),antes);
      assert.equal((await recibir('inexistente')).status,404);assert.equal((await cancelar('inexistente')).status,404);
    });
  } finally {
    if(server) await new Promise(resolve=>{server.close(resolve);server.closeAllConnections();});
    await real.rollback();await sandbox.close();
  }
});
