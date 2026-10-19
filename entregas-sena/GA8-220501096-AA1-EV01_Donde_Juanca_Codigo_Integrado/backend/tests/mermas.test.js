const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const mysql = require('mysql2/promise');
const express = require('express');

test('API de mermas contra MySQL con tablas temporales', {
  skip: process.env.RUN_MYSQL_MERMAS_TESTS !== '1'
}, async t => {
  require('dotenv').config({ path: path.join(__dirname, '../.env'), quiet: true });
  const real = await mysql.createConnection({
    host: process.env.DB_HOST, port: process.env.DB_PORT, user: process.env.DB_USER,
    password: process.env.DB_PASSWORD, database: process.env.DB_NAME, connectTimeout: 5000
  });
  let fallo;
  let actor='u1';
  let cierres = 0;
  let server;
  const conexion = {
    beginTransaction: () => real.beginTransaction(),
    query: async (sql, params) => {
      const operacion = sql.includes('UPDATE productos') ? 'update'
        : sql.includes('INSERT INTO movimientos_inventario') ? 'movimiento'
        : sql.includes('INSERT INTO mermas') ? 'merma' : null;
      if (operacion && fallo === operacion) throw new Error('Fallo SQL inyectado');
      if (operacion && fallo === `${operacion}-cero`) return [{ affectedRows: 0 }];
      if (fallo === 'lectura' && sql.includes('LEFT JOIN')) throw new Error('Fallo lectura inyectado');
      return real.query(sql, params);
    },
    commit: async () => { if (fallo === 'commit') throw new Error('Fallo commit inyectado'); await real.commit(); },
    rollback: () => real.rollback(), end: async () => { cierres++; }
  };
  try {
    for (const tabla of ['mermas','merma_motivos','refrigeradores','usuarios','productos','movimientos_inventario']) {
      await real.query(`CREATE TEMPORARY TABLE copia_mermas_${tabla} LIKE ${tabla}`);
      await real.query(`CREATE TEMPORARY TABLE ${tabla} LIKE copia_mermas_${tabla}`);
    }
    const [columnas] = await real.query('SHOW COLUMNS FROM movimientos_inventario');
    assert.ok(columnas.some(c => c.Field === 'referencia_id'), 'Se requiere v2.22 instalada');
    for (const sufijo of ['1','2']) {
      await real.query("INSERT INTO merma_motivos (id,nombre) VALUES (?,?)", [`m${sufijo}`, `Motivo ${sufijo}`]);
      await real.query("INSERT INTO refrigeradores (id,nombre,estado) VALUES (?,?,'activa')", [`r${sufijo}`, `Refrigerador ${sufijo}`]);
      await real.query(`INSERT INTO usuarios (id,nombre,email,password_hash,estado,roles_id)
        VALUES (?,?,?,'fixture','activo',1)`, [`u${sufijo}`, `Usuario ${sufijo}`, `mermas${sufijo}@example.invalid`]);
      await real.query(`INSERT INTO productos
        (id,nombre,codigo,precio_venta,costo_promedio_ponderado,cantidad_disponible,stock_minimo,estado,categorias_id,proveedores_id,historial_costos_id)
        VALUES (?,?,?,100,12.34,27,1,'activo',1,'prov-test','hist-test')`, [`p${sufijo}`, `Producto ${sufijo}`, `MERMA-${sufijo}`]);
    }
    const modulo = { exports: {} };
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../src/controllers/mermasController.js'), 'utf8'), {
      module: modulo, exports: modulo.exports,
      require: nombre => nombre === '../config/db' ? { dbConfig: {} }
        : nombre === 'mysql2' ? { createConnection: () => ({ promise: () => conexion }) } : (nombre === '../services/identidadService' ? require('../src/services/identidadService') : nombre === '../middleware/rolesMiddleware' ? require('../src/middleware/rolesMiddleware') : require(nombre)),
      console: { error() {} }
    });
    const rutas = { exports: {} };
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../src/routes/mermasRoutes.js'), 'utf8'), {
      module: rutas, require: nombre => nombre === '../controllers/mermasController' ? modulo.exports : (nombre === '../services/identidadService' ? require('../src/services/identidadService') : nombre === '../middleware/rolesMiddleware' ? require('../src/middleware/rolesMiddleware') : require(nombre))
    });
    const app = express(); app.use(express.json()); app.use((req,res,next)=>{req.usuario={id:actor,rol:'Administrador'};next();}); app.use('/api/mermas', rutas.exports);
    server = await new Promise(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
    const url = `http://127.0.0.1:${server.address().port}/api/mermas`;
    const request = async (metodo = 'GET', body, query = '') => {
      const r = await fetch(url + query, { method: metodo,
        headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
      return { status: r.status, data: await r.json() };
    };
    const datos = { productos_id:'p1', cantidad:3, merma_motivos_id:'m1', refrigeradores_id:'r1' };
    const preparar = async () => {
      fallo = null;
      await real.query('DELETE FROM mermas'); await real.query('DELETE FROM movimientos_inventario');
      await real.query('UPDATE productos SET cantidad_disponible=27,costo_promedio_ponderado=12.34');
    };
    const estado = async () => {
      const [[p]] = await real.query("SELECT cantidad_disponible FROM productos WHERE id='p1'");
      const [[m]] = await real.query('SELECT COUNT(*) AS n FROM mermas');
      const [[mi]] = await real.query('SELECT COUNT(*) AS n FROM movimientos_inventario');
      return [p.cantidad_disponible, m.n, mi.n];
    };
    await t.test('merma valida, descuento unico, valor, vinculacion y fecha identica UTC', async () => {
      await preparar(); const r = await request('POST', {...datos, valor_economico:999});
      assert.equal(r.status, 201); assert.equal(r.data.datos.valor_economico, '37.02');
      assert.equal(r.data.datos.stock_anterior, 27); assert.equal(r.data.datos.stock_actual, 24);
      assert.match(r.data.datos.creado_en, /^\d{4}-\d{2}-\d{2}T.*Z$/);
      assert.deepEqual(await estado(), [24,1,1]);
      const [[m]] = await real.query(`SELECT mi.*,m.id AS merma_id,m.valor_economico,
        m.creado_en=mi.creado_en AS fechas_iguales,
        ABS(TIMESTAMPDIFF(SECOND,UTC_TIMESTAMP(),mi.creado_en)) AS antiguedad
        FROM mermas m JOIN movimientos_inventario mi ON mi.id=m.movimientos_inventario_id`);
      assert.equal(m.tipo,'merma'); assert.equal(m.cantidad,-3);
      assert.equal(m.stock_antes,27); assert.equal(m.stock_despues,24);
      assert.equal(m.referencia_tipo,'merma'); assert.equal(m.referencia_id,m.merma_id);
      assert.equal(m.merma_id,r.data.datos.id); assert.equal(m.id,r.data.datos.movimientos_inventario_id);
      assert.equal(r.data.datos.usuarios_id,actor);assert.equal(m.usuarios_id,actor); assert.equal(m.productos_id,'p1');
      assert.equal(m.fechas_iguales,1); assert.ok(m.antiguedad < 5);
    });
    await t.test('decimal exacto, costo cero y merma que agota existencia', async () => {
      await preparar(); await real.query('UPDATE productos SET costo_promedio_ponderado=0.10');
      assert.equal((await request('POST',datos)).data.datos.valor_economico,'0.30');
      await real.query('UPDATE productos SET costo_promedio_ponderado=0');
      const r = await request('POST',{...datos,cantidad:24});
      assert.equal(r.status,201); assert.equal(r.data.datos.valor_economico,'0.00');
      assert.deepEqual(await estado(),[0,2,2]);
    });
    for (const campo of ['productos_id','merma_motivos_id','refrigeradores_id']) {
      await t.test(`referencia inexistente ${campo}`,async()=>{
        await preparar(); assert.equal((await request('POST',{...datos,[campo]:'inexistente'})).status,404);
        assert.deepEqual(await estado(),[27,0,0]);
      });
      await t.test(`campo obligatorio ${campo}`,async()=>{
        await preparar(); const body={...datos}; delete body[campo];
        assert.equal((await request('POST',body)).status,400); assert.deepEqual(await estado(),[27,0,0]);
      });
    }
    for (const cantidad of [null,0,-1,1.5,'3',true,2147483648]) {
      await t.test(`cantidad invalida ${JSON.stringify(cantidad)}`,async()=>{
        await preparar(); assert.equal((await request('POST',{...datos,cantidad})).status,400);
        assert.deepEqual(await estado(),[27,0,0]);
      });
    }
    await t.test('cantidad ausente o superior a existencia',async()=>{
      await preparar(); const body={...datos}; delete body.cantidad;
      assert.equal((await request('POST',body)).status,400);
      assert.equal((await request('POST',{...datos,cantidad:28})).status,400);
      assert.deepEqual(await estado(),[27,0,0]);
    });
    await t.test('rechazo de costo negativo y valor fuera de DECIMAL',async()=>{
      await preparar(); await real.query('UPDATE productos SET costo_promedio_ponderado=-1');
      assert.equal((await request('POST',datos)).status,409);
      await real.query('UPDATE productos SET costo_promedio_ponderado=99999999.99');
      assert.equal((await request('POST',datos)).status,409); assert.deepEqual(await estado(),[27,0,0]);
    });
    for (const modo of ['update','movimiento','merma','update-cero','movimiento-cero','merma-cero','commit']) {
      await t.test(`rollback completo por fallo ${modo}`,async()=>{
        await preparar(); fallo=modo; const antes=cierres;
        assert.equal((await request('POST',datos)).status,500);
        assert.deepEqual(await estado(),[27,0,0]); assert.equal(cierres,antes+1);
      });
    }
    const fixtures = async () => {
      await preparar();
      for (const [indice,body] of [datos,{...datos,merma_motivos_id:'m2'},
        {...datos,productos_id:'p2',refrigeradores_id:'r2'}].entries()) {
        actor=indice===0?'u1':'u2';
        assert.equal((await request('POST',body)).status,201);
      }
    };
    await t.test('GET real con joins, filtros y paginacion',async()=>{
      await fixtures(); const r=await request(); assert.equal(r.status,200);
      assert.equal(r.data.paginacion.total,3); assert.equal(r.data.datos.length,3);
      const item=r.data.datos[0];
      for(const campo of ['id','cantidad','valor_economico','creado_en','productos_id','producto_nombre',
        'merma_motivos_id','motivo_nombre','refrigeradores_id','refrigerador_nombre','movimientos_inventario_id','usuarios_id','usuario_nombre']) {
        assert.ok(Object.hasOwn(item,campo));
      }
      assert.ok(item.producto_nombre); assert.ok(item.motivo_nombre); assert.ok(item.refrigerador_nombre); assert.ok(item.usuario_nombre);
      for(const [q,total] of [['producto_id=p1',2],['motivo_id=m2',1],['refrigerador_id=r2',1],['usuarios_id=u2',2],
        ['producto_id=p1&motivo_id=m1&refrigerador_id=r1&usuarios_id=u1',1],['producto_id=inexistente',0]]) {
        const filtrado=await request('GET',undefined,'?'+q);
        assert.equal(filtrado.status,200); assert.equal(filtrado.data.paginacion.total,total);
        assert.equal(filtrado.data.datos.length,total);
      }
      const paginado=await request('GET',undefined,'?pagina=2&limite=1');
      assert.deepEqual(paginado.data.paginacion,{pagina:2,limite:1,total:3,total_paginas:3});
      assert.equal(paginado.data.datos[0].id,r.data.datos[1].id);
      const vacio=await request('GET',undefined,'?pagina=9'); assert.deepEqual(vacio.data.datos,[]);
      assert.equal(vacio.data.paginacion.total,3);
    });
    await t.test('GET orden por fecha, parametros invalidos y error SQL',async()=>{
      await fixtures(); await real.query("UPDATE mermas SET creado_en='2025-01-01 00:00:00' WHERE usuarios_id='u1'");
      const r=await request(); assert.equal(r.data.datos.at(-1).usuarios_id,'u1');
      for(const q of ['pagina=0','pagina=-1','pagina=1.5','pagina=abc','limite=0','limite=101','producto_id=',
        'usuarios_id=u1&usuarios_id=u2','motivo_id='+ 'x'.repeat(37),'texto=algo','pagina=9007199254740991&limite=100']) {
        assert.equal((await request('GET',undefined,'?'+q)).status,400);
      }
      fallo='lectura'; assert.equal((await request()).status,500);
    });
    await t.test('GET motivos real y lista de mermas vacia',async()=>{
      await preparar(); const r=await request('GET',undefined,'/motivos'); assert.equal(r.status,200);
      assert.deepEqual(r.data.datos,[{id:'m1',nombre:'Motivo 1'},{id:'m2',nombre:'Motivo 2'}]);
      const vacio=await request(); assert.deepEqual(vacio.data.datos,[]); assert.equal(vacio.data.paginacion.total,0);
    });
  } finally {
    if(server) await new Promise(resolve=>{server.close(resolve);server.closeAllConnections();});
    await real.rollback(); await real.end();
  }
});
