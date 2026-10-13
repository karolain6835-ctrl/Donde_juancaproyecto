const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { calcularCosto } = require('../src/services/juegosService');

test('costo exacto, segundos completos, mitad hacia arriba y limites', () => {
  assert.equal(calcularCosto('3600.00', 61), '61.00');
  assert.equal(calcularCosto('0.01', 1799), '0.00');
  assert.equal(calcularCosto('0.01', 1800), '0.01');
  assert.equal(calcularCosto('12.34', 3600), '12.34');
  assert.equal(calcularCosto('99999999.99', 3600), '99999999.99');
  assert.equal(calcularCosto('0.00', 100), '0.00');
  for (const [tarifa, segundos] of [[null, 1], ['-1.00', 1], ['1.00', -1], ['1.00', 1.5], ['99999999.99', 3601]]) {
    assert.throws(() => calcularCosto(tarifa, segundos), e => e.status === 409);
  }
});

test('API juegos: MySQL real con tablas temporales, sin escrituras persistentes', {
  skip: process.env.RUN_MYSQL_JUEGOS_TESTS !== '1'
}, async t => {
  require('dotenv').config({ path: path.join(__dirname, '../.env'), quiet: true });
  const real = await require('mysql2/promise').createConnection({
    host: process.env.DB_HOST, port: process.env.DB_PORT, user: process.env.DB_USER,
    password: process.env.DB_PASSWORD, database: process.env.DB_NAME, connectTimeout: 5000
  });
  let fallo, server, cierres = 0, solicitudes = 0;
  let actor='u1', conexionesAbiertas=0;
  const conexion = {
    beginTransaction: () => real.beginTransaction(),
    query: async (sql, parametros) => {
      const operacion = sql.includes('INSERT INTO sesiones_juego') ? 'insert-sesion'
        : sql.includes('UPDATE sesiones_juego') ? 'update-sesion'
        : sql.includes('UPDATE activos_juego') ? 'update-activo' : null;
      if (operacion && fallo === operacion) throw new Error('Fallo SQL inyectado');
      if (operacion && fallo === `${operacion}-cero`) return [{ affectedRows: 0 }];
      return real.query(sql, parametros);
    },
    commit: async () => { if (fallo === 'commit') throw new Error('Fallo commit'); await real.commit(); },
    rollback: () => real.rollback(), end: async () => { cierres++; }
  };
  try {
    for (const tabla of ['activos_juego','sesiones_juego','mesas','usuarios','pedidos','pedido_items']) {
      await real.query(`CREATE TEMPORARY TABLE copia_juegos_${tabla} LIKE ${tabla}`);
      await real.query(`CREATE TEMPORARY TABLE ${tabla} LIKE copia_juegos_${tabla}`);
    }
    const [columnas] = await real.query('SHOW COLUMNS FROM sesiones_juego');
    for (const nombre of ['fecha_inicio','fecha_fin','tarifa_hora_aplicada']) assert.ok(columnas.some(c => c.Field === nombre), 'Requiere v2.23');
    for (const n of ['1','2']) {
      await real.query("INSERT INTO activos_juego (id,nombre,estado,tipo,precio_hora) VALUES (?,?,'disponible','billar',3600.00)", [`a${n}`, `Activo ${n}`]);
      await real.query("INSERT INTO mesas (id,numero,estado) VALUES (?,?,'disponible')", [`m${n}`, Number(n)]);
      await real.query("INSERT INTO usuarios (id,nombre,email,password_hash,estado,roles_id) VALUES (?,?,?,'fixture','activo',1)", [`u${n}`, `Usuario ${n}`, `juegos${n}@example.invalid`]);
      await real.query("INSERT INTO pedidos (id,estado,creado_en,mesas_id,usuarios_id,clientes_id) VALUES (?,'abierto',UTC_TIMESTAMP(),?,?,'cliente-fixture')", [`p${n}`, `m${n}`, `u${n}`]);
      await real.query(`INSERT INTO pedido_items (id,precio_unitario,pedido_id,producto_id,cantidad_pedida,cantidad_pagada,estado,pedidos_id,productos_id)
        VALUES (?,0,?,'producto-fixture',1,0,'enviado',?,'producto-fixture')`, [`i${n}`, `p${n}`, `p${n}`]);
    }
    const modulo = { exports: {} };
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../src/controllers/juegosController.js'), 'utf8'), {
      module: modulo, exports: modulo.exports,
      require: nombre => nombre === '../config/db' ? { dbConfig: {} }
        : nombre === 'mysql2' ? { createConnection: () => {conexionesAbiertas++;return { promise: () => conexion };} }
        : nombre === '../services/juegosService' ? { calcularCosto } : (nombre === '../services/identidadService' ? require('../src/services/identidadService') : nombre === '../middleware/rolesMiddleware' ? require('../src/middleware/rolesMiddleware') : require(nombre)),
      console: { error() {} }
    });
    const rutas = { exports: {} };
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../src/routes/juegosRoutes.js'), 'utf8'), {
      module: rutas, require: nombre => nombre === '../controllers/juegosController' ? modulo.exports : (nombre === '../services/identidadService' ? require('../src/services/identidadService') : nombre === '../middleware/rolesMiddleware' ? require('../src/middleware/rolesMiddleware') : require(nombre))
    });
    const app = require('express')(); app.use(require('express').json()); app.use((req,res,next)=>{req.usuario={id:actor,rol:'Administrador'};next();}); app.use('/api/juegos', rutas.exports);
    server = await new Promise(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
    const base = `http://127.0.0.1:${server.address().port}/api/juegos`;
    const request = async (ruta, metodo = 'GET', body) => {
      solicitudes++;
      const r = await fetch(base + ruta, { method: metodo, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
      return { status: r.status, data: await r.json() };
    };
    const body = { activos_juego_id:'a1', mesas_id:'m1', pedido_items_id:'i1' };
    const preparar = async () => {
      actor='u1'; fallo = null; await real.query('DELETE FROM sesiones_juego');
      await real.query("UPDATE activos_juego SET estado='disponible',precio_hora=3600.00");
    };
    const estado = async () => {
      const [[a]] = await real.query("SELECT estado FROM activos_juego WHERE id='a1'");
      const [s] = await real.query('SELECT estado,costo_total,fecha_fin,cerrada_por FROM sesiones_juego');
      return { activo: a.estado, sesiones: s };
    };
    const iniciar = async () => { const r = await request('/iniciar','POST',body); assert.equal(r.status,201,JSON.stringify(r.data)); return r.data.id_sesion; };
    await t.test('listados, filtros y estados invalidos', async () => {
      assert.equal((await request('/activos')).data.datos.length,2);
      assert.equal((await request('/activos?estado=disponible')).data.datos.length,2);
      assert.equal((await request('/activos?estado=mantenimiento')).data.datos.length,0);
      assert.deepEqual((await request('/sesiones')).data.datos,[]);
      for (const ruta of ['/activos?estado=activa','/sesiones?estado=ocupado','/sesiones?estado=']) assert.equal((await request(ruta)).status,400);
    });
    await t.test('inicio real, tarifa congelada, fecha UTC, permite varios activos por mesa', async () => {
      await preparar(); const id = await iniciar();
      const r = (await request('/sesiones?estado=activa')).data.datos[0];
      assert.equal(r.id,id); assert.equal(r.tipo_juego,'billar'); assert.equal(r.activo_nombre,'Activo 1');
      assert.equal(r.tarifa_hora_aplicada,'3600.00'); assert.match(r.fecha_inicio,/Z$/);
      assert.equal(r.costo_total,null); assert.equal(r.fecha_fin,null); assert.equal(r.cerrada_por,null);
      assert.equal((await estado()).activo,'ocupado');
      await real.query("UPDATE activos_juego SET precio_hora=9999.99 WHERE id='a1'");
      assert.equal((await request('/sesiones')).data.datos[0].tarifa_hora_aplicada,'3600.00');
      assert.equal((await request('/iniciar','POST',{...body,activos_juego_id:'a2'})).status,201);
    });
    for (const campo of Object.keys(body)) await t.test(`referencia inexistente ${campo}`, async () => {
      await preparar(); assert.equal((await request('/iniciar','POST',{...body,[campo]:'no-existe'})).status,404);
      assert.deepEqual(await estado(),{ activo:'disponible', sesiones:[] });
    });
    for (const valor of ['ocupado','mantenimiento']) await t.test(`activo ${valor}`, async () => {
      await preparar(); await real.query('UPDATE activos_juego SET estado=?',[valor]);
      assert.equal((await request('/iniciar','POST',body)).status,409);
      assert.equal((await estado()).sesiones.length,0);
    });
    await t.test('item de otra mesa, body incompleto o campos calculados', async () => {
      await preparar(); assert.equal((await request('/iniciar','POST',{...body,pedido_items_id:'i2'})).status,400);
      for (const extra of [{costo_total:1},{tipo_juego:'tejo'},{tarifa_hora_aplicada:1},{fecha_inicio:'2026-01-01'}]) assert.equal((await request('/iniciar','POST',{...body,...extra})).status,400);
      assert.equal((await request('/iniciar','POST',{})).status,400);
    });
    await t.test('sesion duplicada aun si activo esta marcado disponible', async () => {
      await preparar(); await iniciar(); await real.query("UPDATE activos_juego SET estado='disponible'");
      assert.equal((await request('/iniciar','POST',body)).status,409);
      assert.equal((await estado()).sesiones.length,1);
    });
    await t.test('finalizar con costo exacto congelado y rechazar segundo cierre', async () => {
      await preparar(); const id = await iniciar();
      await real.query('UPDATE sesiones_juego SET fecha_inicio=UTC_TIMESTAMP()-INTERVAL 3600 SECOND');
      await real.query('UPDATE activos_juego SET precio_hora=1.00');
      actor='u2';
      const r = await request(`/${id}/terminar`,'PUT',{});
      assert.equal(r.status,200); assert.equal(r.data.datos.estado,'cerrada'); assert.equal(r.data.datos.cerrada_por,'u2'); assert.equal(r.data.datos.iniciada_por,'u1');
      const [[s]] = await real.query('SELECT TIMESTAMPDIFF(SECOND,fecha_inicio,fecha_fin) AS segundos,CAST(costo_total AS CHAR) AS costo FROM sesiones_juego');
      assert.equal(s.costo,calcularCosto('3600.00',s.segundos)); assert.equal(r.data.total_cobrado,s.costo);
      assert.equal((await estado()).activo,'disponible');
      const antes = await estado(); assert.equal((await request(`/${id}/terminar`,'PUT',{})).status,409);
      assert.deepEqual(await estado(),antes);
      assert.equal((await request('/sesiones?estado=cerrada')).data.datos.length,1);
      assert.equal((await request('/sesiones?estado=activa')).data.datos.length,0);
    });
    await t.test('cierre: usuario/sesion inexistentes y costo del cliente rechazado', async () => {
      await preparar(); const id = await iniciar();
      assert.equal((await request('/no-existe/terminar','PUT',{})).status,404);
      assert.equal((await request(`/${id}/terminar`,'PUT',{cerrada_por:'no-existe'})).status,400);
      assert.equal((await request(`/${id}/terminar`,'PUT',{cerrada_por:'u1',costo_total:1})).status,400);
      assert.equal((await estado()).sesiones[0].estado,'activa');
    });
    for (const columna of ['fecha_inicio','tarifa_hora_aplicada']) await t.test(`historica sin ${columna}`, async () => {
      await preparar(); const id = await iniciar(); await real.query(`UPDATE sesiones_juego SET ${columna}=NULL`);
      const r = await request(`/${id}/terminar`,'PUT',{});
      assert.equal(r.status,409); assert.match(r.data.error,/conciliación/);
      assert.equal((await estado()).activo,'ocupado'); assert.equal((await estado()).sesiones[0].estado,'activa');
    });
    await t.test('duracion negativa y costo fuera de rango no cierran', async () => {
      await preparar(); const id = await iniciar(); await real.query('UPDATE sesiones_juego SET fecha_inicio=UTC_TIMESTAMP()+INTERVAL 1 DAY');
      assert.equal((await request(`/${id}/terminar`,'PUT',{})).status,409);
      await real.query('UPDATE sesiones_juego SET fecha_inicio=UTC_TIMESTAMP()-INTERVAL 2 HOUR,tarifa_hora_aplicada=99999999.99');
      assert.equal((await request(`/${id}/terminar`,'PUT',{})).status,409);
      assert.equal((await estado()).sesiones[0].estado,'activa');
    });
    for (const operacion of ['insert-sesion','insert-sesion-cero','update-activo','update-activo-cero','commit']) await t.test(`rollback inicio ${operacion}`, async () => {
      await preparar(); fallo = operacion;
      assert.equal((await request('/iniciar','POST',body)).status,500);
      assert.deepEqual(await estado(),{activo:'disponible',sesiones:[]});
    });
    for (const operacion of ['update-sesion','update-sesion-cero','update-activo','update-activo-cero','commit']) await t.test(`rollback cierre ${operacion}`, async () => {
      await preparar(); const id = await iniciar(); const antes = await estado(); fallo = operacion;
      assert.equal((await request(`/${id}/terminar`,'PUT',{})).status,500);
      assert.deepEqual(await estado(),antes);
    });
    assert.equal(cierres,conexionesAbiertas,'Cada solicitud libera su conexion');
  } finally {
    if (server) await new Promise(resolve => server.close(resolve));
    await real.end();
  }
});
