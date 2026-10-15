const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const { evaluarLiberacionMesa } = require('../src/services/liquidacionService');
function load(name, connection) {
  const module = { exports: {} };
  const db = { dbConfig: {}, query(sql, params, callback) { if (typeof params === 'function') { callback = params; params = []; } connection.query(sql, params).then(([rows]) => callback(null, rows), callback); } };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../src/controllers', name), 'utf8'), { module, exports: module.exports, console: { error() {} }, require: name => name === '../config/db' ? db : name === 'mysql2' ? { createConnection: () => ({ promise: () => connection }) } : require(name.startsWith('.') ? path.join(__dirname, '../src/controllers', name) : name) });
  return module.exports;
}
const invoke = (fn, body = {}, params = {}) => new Promise((resolve, reject) => {
  Promise.resolve(fn({ body, params, query: {}, usuario: { id: 'actor', rol: 'Administrador' } }, { status(code) { this.code = code; return this; }, json(data) { resolve({ status: this.code || 200, data }); } })).catch(reject);
});
test('Protección de liberación distingue pedidos abiertos y juegos activos', async () => {
  for (const [orders, games, message] of [[[ { id: 'p', estado: 'abierto' } ], [], /pedidos abiertos/], [[], [{ id: 'j' }], /juego activa/], [[], [], null]]) {
    const result = await evaluarLiberacionMesa({ query: async sql => [sql.includes('FROM pedidos') ? orders : games] }, 'm');
    assert.equal(result.puede_liberarse, message === null); if (message) assert.match(result.motivo, message);
  }
});
test('Saldo se obtiene de consumos menos pagos verificados, no del total cacheado', async () => {
  const result = await evaluarLiberacionMesa({ query: async sql => {
    if (sql.includes('FROM sesiones_juego')) return [[]];
    if (sql.includes('FROM pedidos')) return [[{ id: 'p', estado: 'cerrado', total_general: '0.00' }]];
    if (sql.includes('FROM pedido_items')) return [[{ id: 'i', pedido_id: 'p', pedidos_id: 'p', estado: 'servido', subtotal: '100.00' }]];
    if (sql.includes('FROM pagos')) return [[{ id: 'pa', estado: 'pagado', verificacion_estado: 'verificado', total_seleccionado: '40.00' }]];
    return [[]];
  } }, 'm');
  assert.equal(result.puede_liberarse, false); assert.match(result.motivo, /saldo pendiente/);
});
test('Ocupación y liberación con MySQL temporal, transacciones y stock intacto', { skip: process.env.RUN_MYSQL_MESAS_TESTS !== '1' }, async t => {
  require('dotenv').config({ path: path.join(__dirname, '../.env'), quiet: true });
  const c = await require('mysql2/promise').createConnection({ host: process.env.DB_HOST, port: process.env.DB_PORT, user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME });
  let fail = false;
  try {
    for (const table of ['mesas', 'usuarios', 'clientes', 'pedidos', 'pedido_items', 'productos', 'sesiones_juego', 'activos_juego', 'pagos', 'auditoria', 'movimientos_inventario', 'jugadores', 'ronda_jugadores', 'rondas', 'sesiones_division', 'sesiones_division_cuentas']) {
      await c.query(`CREATE TEMPORARY TABLE copia_ocupacion_${table} LIKE ${table}`); await c.query(`CREATE TEMPORARY TABLE ${table} LIKE copia_ocupacion_${table}`);
    }
    await require('./helpers/participantesTemporales')(c, { pedidos: true, items: true });
    await require('./helpers/divisionesTemporales')(c);
    await c.query("INSERT INTO usuarios(id,nombre,email,password_hash,estado,roles_id) VALUES ('actor','Actor','a@example.invalid','test','activo',1)");
    await c.query("INSERT INTO clientes(id,nombre,estado,usuarios_id) VALUES ('c','Cliente','activo','actor')");
    await c.query("INSERT INTO mesas(id,numero,estado,creado_en) VALUES ('m',1,'disponible',NOW())");
    await c.query("INSERT INTO productos(id,nombre,codigo,precio_venta,costo_promedio_ponderado,cantidad_disponible,stock_minimo,estado,categorias_id,proveedores_id,historial_costos_id) VALUES ('pr','Producto','COD',100,50,5,1,'activo',1,'prov','hist')");
    await c.query("INSERT INTO activos_juego(id,nombre,estado,tipo,precio_hora) VALUES ('a','Billar','disponible','billar',3600)");
    const connection = { beginTransaction: () => c.beginTransaction(), commit: () => c.commit(), rollback: () => c.rollback(), end: async () => {}, query(sql, params) {
      if (fail && sql.includes("UPDATE mesas SET estado='ocupada'")) throw new Error('Fallo ocupación'); return c.query(sql, params);
    } };
    const pedidos = load('pedidosController.js', connection), mesas = load('mesasController.js', connection), juegos = load('juegosController.js', connection);
    const state = async () => (await c.query("SELECT estado FROM mesas WHERE id='m'"))[0][0].estado;
    const stock = async () => (await c.query("SELECT cantidad_disponible FROM productos WHERE id='pr'"))[0][0].cantidad_disponible;
    const body = { mesas_id: 'm', usuarios_id: 'actor', clientes_id: 'c' };
    const change = estado => invoke(mesas.actualizarEstadoMesa, { estado }, { id: 'm' });
    let pedidoId;
    await t.test('fallo al ocupar revierte también creación del pedido', async () => {
      fail = true; assert.equal((await invoke(pedidos.crearPedido, body)).status, 500); fail = false;
      assert.equal(await state(), 'disponible'); assert.equal((await c.query('SELECT COUNT(*) AS n FROM pedidos'))[0][0].n, 0);
    });
    await t.test('crear pedido en disponible ocupa; otro pedido en ocupada funciona', async () => {
      const first = await invoke(pedidos.crearPedido, body); assert.equal(first.status, 201); pedidoId = first.data.id_pedido;
      assert.equal(await state(), 'ocupada'); assert.equal((await invoke(pedidos.crearPedido, body)).status, 201); assert.equal(await stock(), 5);
    });
    await t.test('liberar con pedido abierto devuelve 409 y consulta informativa bloqueada', async () => {
      const result = await change('disponible'); assert.equal(result.status, 409); assert.match(result.data.error, /pedidos abiertos/);
      assert.equal((await invoke(mesas.consultarLiberacionMesa, {}, { id: 'm' })).data.datos.puede_liberarse, false);
      assert.equal(await state(), 'ocupada');
    });
    await t.test('cerrado con saldo real pendiente bloquea aunque totales cacheados sean cero', async () => {
      await c.query("UPDATE pedidos SET estado='cerrado'");
      await c.query("INSERT INTO pedido_items(id,precio_unitario,pedido_id,producto_id,cantidad_pedida,cantidad_pagada,estado,pedidos_id,productos_id) VALUES ('i',100,?,'pr',1,0,'servido',?,'pr')", [pedidoId, pedidoId]);
      const result = await change('disponible'); assert.equal(result.status, 409); assert.match(result.data.error, /saldo pendiente/);
    });
    await t.test('inicio de juego ocupa mesa disponible y no modifica inventario', async () => {
      await c.query("UPDATE mesas SET estado='disponible' WHERE id='m'");
      fail = true;
      assert.equal((await invoke(juegos.iniciarJuego, { activos_juego_id: 'a', mesas_id: 'm', pedido_items_id: 'i' })).status, 500);
      fail = false;
      assert.equal((await c.query('SELECT COUNT(*) AS n FROM sesiones_juego'))[0][0].n, 0);
      assert.equal((await c.query("SELECT estado FROM activos_juego WHERE id='a'"))[0][0].estado, 'disponible');
      assert.equal(await state(), 'disponible');
      const result = await invoke(juegos.iniciarJuego, { activos_juego_id: 'a', mesas_id: 'm', pedido_items_id: 'i' });
      assert.equal(result.status, 201); assert.equal(await state(), 'ocupada'); assert.equal(await stock(), 5);
    });
    await t.test('liberar con juego activo devuelve motivo 409', async () => {
      const result = await change('disponible'); assert.equal(result.status, 409); assert.match(result.data.error, /juego activa/);
    });
    await t.test('sin actividad permite liberar y ocupar manualmente', async () => {
      await c.query("UPDATE sesiones_juego SET estado='cancelada'");
      await c.query("UPDATE pedido_items SET estado='cancelado'");
      assert.equal((await change('disponible')).status, 200); assert.equal(await state(), 'disponible');
      assert.equal((await change('ocupada')).status, 200); assert.equal(await state(), 'ocupada'); assert.equal(await stock(), 5);
    });
    await t.test('crear pedido conserva en_cobro y permisos de responsable', async () => {
      await c.query("UPDATE mesas SET estado='en_cobro' WHERE id='m'");
      assert.equal((await invoke(pedidos.crearPedido, body)).status, 201); assert.equal(await state(), 'en_cobro');
    });
    await t.test('liquidar una cuenta no libera si otro pedido cerrado conserva deuda', async () => {
      const [others] = await c.query('SELECT id FROM pedidos WHERE id<>? ORDER BY id', [pedidoId]);
      await c.query("UPDATE pedidos SET estado='cerrado'");
      await c.query("INSERT INTO pedido_items(id,precio_unitario,pedido_id,producto_id,cantidad_pedida,cantidad_pagada,estado,pedidos_id,productos_id) VALUES ('deuda',100,?,'pr',1,0,'servido',?,'pr')", [others[0].id, others[0].id]);
      const liquidation = require('../src/services/liquidacionService');
      await c.beginTransaction();
      try {
        const pedido = { id: pedidoId, mesas_id: 'm', estado: 'cerrado' };
        const result = await liquidation.actualizarLiquidacion(c, pedido, await liquidation.calcularCuenta(c, pedido));
        assert.equal(result.estado_mesa, 'en_cobro'); await c.commit();
      } catch (error) { await c.rollback(); throw error; }
      assert.equal(await state(), 'en_cobro'); assert.equal(await stock(), 5);
    });
    await t.test('traslado conserva su flujo y no libera origen con deuda histórica', async () => {
      await c.query("INSERT INTO mesas(id,numero,estado,creado_en) VALUES ('destino',2,'disponible',NOW())");
      const [other] = await c.query('SELECT id FROM pedidos WHERE id<>? ORDER BY id', [pedidoId]);
      await c.query("UPDATE pedidos SET estado='abierto' WHERE id=?", [other[1].id]);
      const body = { mesa_origen_id: 'm', mesa_destino_id: 'destino' };
      assert.equal((await invoke(mesas.trasladarMesa, body)).status, 409);
      assert.equal(await state(), 'en_cobro');
      assert.equal((await c.query('SELECT mesas_id FROM pedidos WHERE id=?', [other[1].id]))[0][0].mesas_id, 'm');
      await c.query("UPDATE pedido_items SET estado='cancelado' WHERE id='deuda'");
      assert.equal((await invoke(mesas.trasladarMesa, body)).status, 200);
      assert.equal(await state(), 'disponible');
      assert.equal((await c.query("SELECT estado FROM mesas WHERE id='destino'"))[0][0].estado, 'en_cobro');
      assert.equal((await c.query('SELECT mesas_id FROM pedidos WHERE id=?', [other[1].id]))[0][0].mesas_id, 'destino'); assert.equal(await stock(), 5);
    });
  } finally { await c.end(); }
});
