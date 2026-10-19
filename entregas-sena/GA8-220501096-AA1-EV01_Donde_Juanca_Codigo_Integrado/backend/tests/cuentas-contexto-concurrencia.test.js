const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { randomUUID } = require('node:crypto');
const { calcularCuenta, bloquearPedido, consultarPedido } = require('../src/services/liquidacionService');
const { divisionesActivasPedido } = require('../src/services/divisionesService');
const { resumen } = require('../src/services/divisionCuotasService');

test('Contexto informativo no bloquea; liquidación conserva bloqueos por defecto', async () => {
  for (const bloquear of [false, true]) {
    const queries = [];
    const c = { query: async sql => { queries.push(sql); return [[]]; } };
    const cuenta = await calcularCuenta(c, { id: 'p' }, bloquear ? undefined : { bloquear: false });
    assert.equal(cuenta.saldo, 0n);
    await divisionesActivasPedido(c, 'p', bloquear ? undefined : { bloquear: false });
    assert.equal(queries.length, 4);
    assert.ok(queries.every(sql => /FOR UPDATE/.test(sql) === bloquear));
  }
  const queries = [];
  const c = { query: async sql => {
    queries.push(sql);
    return [sql.includes('FROM pedidos') ? [{ id: 'p', mesas_id: 'm', estado: 'abierto' }] : [{ id: 'm' }]];
  } };
  await consultarPedido(c, 'p');
  assert.ok(queries.every(sql => !/FOR UPDATE/.test(sql)));
  queries.length = 0;
  await bloquearPedido(c, 'p');
  assert.match(queries[1], /FROM mesas.*FOR UPDATE/);
  assert.match(queries[2], /FROM pedidos.*FOR UPDATE/);
  const resumenQueries = [];
  await resumen({ query: async sql => { resumenQueries.push(sql); return [[]]; } },
    { id: 'd', modalidad: 'items', mesas_id: 'm' }, { bloquear: false });
  assert.ok(resumenQueries.every(sql => !/FOR UPDATE/.test(sql)));
});

test('HTTP/MySQL: contextos y pagos concurrentes, recargas y cierre único', {
  skip: process.env.RUN_MYSQL_CUENTAS_CONCURRENCIA_TESTS !== '1', timeout: 120000
}, async t => {
  require('dotenv').config({ path: path.join(__dirname, '../.env'), quiet: true });
  const mysql = require('mysql2/promise');
  const config = { host: process.env.DB_HOST, port: process.env.DB_PORT,
    user: process.env.DB_USER, password: process.env.DB_PASSWORD };
  const admin = await mysql.createConnection(config);
  const database = 'dj_test_contexto_' + randomUUID().replaceAll('-', '');
  let c, server, created = false;
  const errors = [], contextQueries = [];
  try {
    // Copiar únicamente el esquema instalado. No ejecutar baseline ni migraciones.
    const [tables] = await admin.query('SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA=? AND TABLE_TYPE=\'BASE TABLE\'', [process.env.DB_NAME]);
    const quote = s => '`' + s.replaceAll('`', '``') + '`';
    await admin.query('CREATE DATABASE ' + quote(database)); created = true;
    for (const table of tables) await admin.query('CREATE TABLE ' + quote(database) + '.' + quote(table.TABLE_NAME) + ' LIKE ' + quote(process.env.DB_NAME) + '.' + quote(table.TABLE_NAME));
    const dbConfig = { ...config, database };
    c = await mysql.createConnection(dbConfig);
    const load = file => {
      const m = { exports: {} };
      vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../src/controllers', file), 'utf8'), {
        module: m, exports: m.exports, console: { error() {} }, require: name => {
          if (name === '../config/db') return { dbConfig };
          if (name === 'mysql2') return { createConnection: cfg => {
            const real = require('mysql2').createConnection(cfg).promise();
            let soloLectura = false;
            return { promise: () => ({
              beginTransaction: () => real.beginTransaction(), commit: () => real.commit(),
              rollback: () => real.rollback(), end: () => real.end(),
              query: async (...args) => {
                if (args[0].includes('CONSISTENT SNAPSHOT, READ ONLY')) soloLectura = true;
                if (file === 'divisionContextoController.js' || soloLectura) contextQueries.push(args[0]);
                try { return await real.query(...args); } catch (e) { errors.push(e.code); throw e; }
              }
            }) };
          } };
          return require(name.startsWith('.') ? path.join(__dirname, '../src/controllers', name) : name);
        }
      });
      return m.exports;
    };
    const contexto = load('divisionContextoController.js'), pagos = load('pagosController.js');
    const divisiones = load('divisionesController.js');
    const express = require('express'), app = express();
    app.use(express.json());
    app.use((req, res, next) => { req.usuario = { id: 'u', rol: 'Administrador' }; next(); });
    app.get('/api/pedidos/:pedido_id/division-contexto', contexto.obtener);
    app.post('/api/pagos', pagos.registrarPago);
    app.patch('/api/pagos/:id/verificar', pagos.verificarPago);
    app.patch('/api/sesiones-division/:id/completar', divisiones.completarDivision);
    app.get('/api/sesiones-division/:id', divisiones.obtenerResumenDivision);
    server = app.listen(0, '127.0.0.1');
    await require('node:events').once(server, 'listening');
    const url = 'http://127.0.0.1:' + server.address().port + '/api';
    let responses = 0;
    const request = async (route, method = 'GET', body) => {
      const r = await fetch(url + route, { method, headers: { 'Content-Type': 'application/json' }, body: body && JSON.stringify(body) });
      responses++;
      const data = await r.json();
      assert.ok(r.status < 500, JSON.stringify({ route, status: r.status, data }));
      if (route.endsWith('/division-contexto') && r.status === 200) {
        assert.ok(['0.00', '50.25', '100.50'].includes(data.datos.saldo));
        assert.ok(Number(data.datos.pendiente_verificacion) <= Number(data.datos.saldo));
      }
      return { status: r.status, data };
    };
    await c.query("INSERT INTO usuarios(id,nombre,email,password_hash,estado,roles_id) VALUES ('u','Actor','contexto@example.invalid','fixture','activo',1)");
    await c.query("INSERT INTO productos(id,nombre,codigo,precio_venta,costo_promedio_ponderado,cantidad_disponible,stock_minimo,estado,categorias_id,proveedores_id) VALUES ('pr','Producto','CTX',100,0,50,1,'activo',1,'prov')");
    for (let round = 0; round < 10; round++) {
      await t.test('ronda concurrente ' + (round + 1), async () => {
        const p = 'p' + round, m = 'm' + round, s = 's' + round, d = 'd' + round;
        await c.query("INSERT INTO mesas(id,numero,estado,creado_en) VALUES (?,?,'ocupada',NOW())", [m, round + 1]);
        await c.query("INSERT INTO sesiones_mesa(id,mesas_id,estado,iniciada_en) VALUES (?,?,'activa',NOW())", [s, m]);
        await c.query("INSERT INTO pedidos(id,estado,creado_en,mesas_id,usuarios_id,sesion_mesa_id) VALUES (?,'abierto',NOW(),?,'u',?)", [p, m, s]);
        await c.query("INSERT INTO pedido_items(id,precio_unitario,pedido_id,producto_id,cantidad_pedida,cantidad_pagada,estado,pedidos_id,productos_id) VALUES (?,100.50,?,'pr',1,0,'servido',?,'pr')", ['i' + round, p, p]);
        await c.query("INSERT INTO sesiones_division_cuentas(id,modalidad,mesas_id,usuarios_id,sesion_mesa_id,pedido_id,estado,total_objetivo,total_cuenta_base) VALUES (?,'equitativa',?,'u',?,?,'activa',100.50,100.50)", [d, m, s, p]);
        for (const who of ['a', 'b']) {
          await c.query("INSERT INTO jugadores(id,nombre,mesas_id,tipo_participante,sesion_mesa_id) VALUES (?,?,?,'temporal',?)", [who + round, who, m, s]);
          await c.query("INSERT INTO division_participantes(id,sesion_division_id,jugadores_id,nombre_cliente,total_asignado) VALUES (?,?,?,?,50.25)", [who + round, d, who + round, who]);
        }
        const reload = () => Promise.all(Array.from({ length: 30 }, (_, i) => request(i < 20
          ? '/pedidos/p' + (i % (round + 1)) + '/division-contexto'
          : '/sesiones-division/d' + (i % (round + 1)))));
        // Un lector debe responder aun mientras una escritura mantiene el mutex de mesa/pedido.
        await c.beginTransaction();
        await c.query('SELECT id FROM mesas WHERE id=? FOR UPDATE', [m]);
        await c.query('SELECT id FROM pedidos WHERE id=? FOR UPDATE', [p]);
        await c.query('SELECT id FROM sesiones_division_cuentas WHERE id=? FOR UPDATE', [d]);
        await c.query('UPDATE pedido_items SET precio_unitario=101.50 WHERE id=?', ['i' + round]);
        try {
          const read = await request('/pedidos/' + p + '/division-contexto');
          assert.equal(read.status, 200); assert.equal(read.data.datos.saldo, '100.50');
          const summary = await request('/sesiones-division/' + d);
          assert.equal(summary.status, 200); assert.equal(summary.data.data.total_asignado, '100.50');
          assert.equal(summary.data.data.desactualizada, false);
        } finally { await c.rollback(); }
        const payment = who => request('/pagos', 'POST', { id: 'pay-' + who + round, pedidos_id: p,
          sesion_division_id: d, participante_id: who + round, metodo_de_pago: 'efectivo', total_seleccionado: '50.25' });
        // Dos pagos y su repetición duplicada compiten con lecturas de cuentas de distintas mesas.
        const [a, b, duplicate] = await Promise.all([payment('a'), payment('b'), payment('a'), reload()]);
        assert.deepEqual([a.status, duplicate.status].sort(), [201, 409]);
        assert.equal(b.status, 201);
        const verify = who => request('/pagos/pay-' + who + round + '/verificar', 'PATCH', { verificacion_estado: 'verificado' });
        const results = await Promise.all([verify('a'), verify('b'), reload()]);
        assert.equal(results[0].status, 200); assert.equal(results[1].status, 200);
        const closes = await Promise.all([
          request('/sesiones-division/' + d + '/completar', 'PATCH', {}),
          request('/sesiones-division/' + d + '/completar', 'PATCH', {}), reload()
        ]);
        assert.equal(closes[0].status, 200); assert.equal(closes[1].status, 200);
        await Promise.all([verify('a'), verify('b'), reload()]);
        const [[state]] = await c.query('SELECT p.estado pedido,m.estado mesa,s.estado visita FROM pedidos p JOIN mesas m ON m.id=p.mesas_id JOIN sesiones_mesa s ON s.id=p.sesion_mesa_id WHERE p.id=?', [p]);
        assert.deepEqual(state, { pedido: 'cerrado', mesa: 'disponible', visita: 'cerrada' });
        const [[totals]] = await c.query("SELECT COUNT(*) cantidad,CAST(SUM(total_seleccionado) AS CHAR) total FROM pagos WHERE pedidos_id=? AND verificacion_estado='verificado'", [p]);
        assert.equal(totals.cantidad, 2); assert.equal(totals.total, '100.50');
        const [[closed]] = await c.query("SELECT COUNT(*) n FROM auditoria WHERE tipo_evento='division_completada' AND entidad_id=?", [d]);
        assert.equal(closed.n, 1);
        assert.equal((await c.query("SELECT cantidad_disponible FROM productos WHERE id='pr'"))[0][0].cantidad_disponible, 50);
        assert.equal((await c.query('SELECT COUNT(*) n FROM movimientos_inventario'))[0][0].n, 0);
      });
    }
    assert.ok(contextQueries.some(sql => sql.includes('CONSISTENT SNAPSHOT, READ ONLY')));
    assert.ok(contextQueries.every(sql => !/FOR UPDATE|LOCK IN SHARE MODE/i.test(sql)));
    assert.deepEqual(errors, []);
    t.diagnostic(responses + ' respuestas HTTP; 0 errores SQL; 0 respuestas 500; 10 cierres únicos; stock intacto.');
  } finally {
    if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
    if (c) await c.end();
    if (created && /^dj_test_contexto_[a-f0-9]{32}$/.test(database)) await admin.query('DROP DATABASE `' + database + '`');
    await admin.end();
  }
});
