const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
function load(name, db, connection) {
  connection ||= { query: (sql, params) => new Promise((resolve, reject) => db.query(sql, params, (error, rows) => error ? reject(error) : resolve([rows]))), beginTransaction: async () => {}, commit: async () => {}, rollback: async () => {}, end: async () => {} };
  const module = { exports: {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../src/controllers', name), 'utf8'), { module, console: { error() {} }, require: name => {
    if (name === '../config/db') return db;
    if (name === 'mysql2' && connection) return { createConnection: () => ({ promise: () => connection }) };
    return require(name.startsWith('.') ? path.join(__dirname, '../src/controllers', name) : name);
  } });
  return module.exports;
}
const invoke = (fn, body = {}, params = {}, usuario = { id: 'actor', rol: 'Administrador' }) => new Promise((resolve, reject) => {
  Promise.resolve(fn({ body, params, usuario, query: {} }, { status(code) { this.code = code; return this; }, json(data) { resolve({ status: this.code || 200, data }); } })).catch(reject);
});
test('Estado agrupado excluye canceladas y representa mezclas sin persistir estados nuevos', () => {
  const { estadoDerivado } = load('kanbanController.js', {});
  for (const [states, expected] of [[['enviado', 'enviado'], 'enviado'], [['enviado', 'preparando'], 'preparando'], [['preparando', 'servido'], 'parcialmente_servido'], [['enviado', 'servido'], 'parcialmente_servido'], [['servido', 'cancelado'], 'servido'], [['cancelado'], null], [[], null]]) assert.equal(estadoDerivado(states.map(estado => ({ estado }))), expected);
});
test('Diez ítems generan una sola tarjeta; pedidos solo cancelados no aparecen', async () => {
  const rows = Array.from({ length: 10 }, (_, n) => ({ pedido_id: 'p', mesa: 4, responsable: 'Responsable', pedido_item_id: `i${n}`, producto: 'Producto', cantidad_pedida: 1, estado: 'enviado' }));
  rows.push({ ...rows[0], pedido_id: 'cancelado', estado: 'cancelado' });
  const controller = load('kanbanController.js', { query(sql, cb) { cb(null, rows); } });
  const result = await invoke(controller.obtenerPedidosAgrupados);
  assert.equal(result.data.datos.length, 1); assert.equal(result.data.datos[0].items.length, 10); assert.equal(result.data.datos[0].estado_derivado, 'enviado');
});
test('Responsable: Mesero/Mesera ajeno 403; propio permitido; Admin puede asignar otro activo', async () => {
  const body = { mesas_id: 'm', usuarios_id: 'otro', clientes_id: 'c' };
  for (const rol of ['Mesero', 'Mesera']) {
    const controller = load('pedidosController.js', { query() { assert.fail('No debe consultar'); } });
    assert.equal((await invoke(controller.crearPedido, body, {}, { id: 'actor', rol })).status, 403);
  }
  for (const rol of ['Administrador', 'SuperAdmin', 'Mesero', 'Mesera']) {
    let responsable;
    const controller = load('pedidosController.js', { query(sql, params, cb) {
      if (sql.includes('FROM jugadores')) return cb(null, []);
      if (sql.includes('INSERT INTO jugadores')) return cb(null, { affectedRows: 1 });
      if (sql.includes('INSERT INTO pedidos')) { responsable = params[5]; cb(null, { affectedRows: 1 }); }
      else cb(null, [{ id: params[0], nombre: 'Cliente', estado: sql.includes('FROM mesas') ? 'ocupada' : 'activo' }]);
    } });
    const usuarios_id = ['Mesero', 'Mesera'].includes(rol) ? 'actor' : 'otro';
    assert.equal((await invoke(controller.crearPedido, { ...body, usuarios_id }, {}, { id: 'actor', rol })).status, 201);
    assert.equal(responsable, usuarios_id);
  }
});
test('Responsable inexistente/inactivo se rechaza antes de insertar', async () => {
  for (const [rows, status] of [[[], 404], [[{ estado: 'inactivo' }], 409]]) {
    const controller = load('pedidosController.js', { query(sql, params, cb) {
      assert.ok(!sql.startsWith('INSERT')); cb(null, sql.includes('FROM mesas') ? [{ id: 'm', estado: 'ocupada' }] : sql.includes('FROM clientes') ? [{ estado: 'activo' }] : rows);
    } });
    assert.equal((await invoke(controller.crearPedido, { mesas_id: 'm', usuarios_id: 'otro', clientes_id: 'c' })).status, status);
  }
});
test('Kanban agrupado y despacho contra MySQL temporal', { skip: process.env.RUN_MYSQL_KANBAN_TESTS !== '1' }, async t => {
  require('dotenv').config({ path: path.join(__dirname, '../.env'), quiet: true });
  const c = await require('mysql2/promise').createConnection({ host: process.env.DB_HOST, port: process.env.DB_PORT, user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME });
  let fail = false, writes = 0;
  try {
    for (const table of ['usuarios', 'mesas', 'clientes', 'pedidos', 'productos', 'pedido_items', 'kanban_movimientos', 'movimientos_inventario']) {
      await c.query(`CREATE TEMPORARY TABLE copia_group_${table} LIKE ${table}`); await c.query(`CREATE TEMPORARY TABLE ${table} LIKE copia_group_${table}`);
    }
    await c.query("INSERT INTO usuarios(id,nombre,email,password_hash,estado,roles_id) VALUES ('actor','Actor','a@example.invalid','test','activo',1)");
    await c.query("INSERT INTO mesas(id,numero,estado,creado_en) VALUES ('m',4,'ocupada',NOW())");
    await c.query("INSERT INTO pedidos(id,estado,creado_en,mesas_id,usuarios_id,clientes_id) VALUES ('p','abierto',NOW(),'m','actor','c')");
    await c.query("INSERT INTO productos(id,nombre,codigo,precio_venta,costo_promedio_ponderado,cantidad_disponible,stock_minimo,estado,categorias_id,proveedores_id,historial_costos_id) VALUES ('pr','Producto','COD',100,50,30,1,'activo',1,'prov','hist')");
    for (let n = 0; n < 10; n++) await c.query("INSERT INTO pedido_items(id,precio_unitario,pedido_id,producto_id,cantidad_pedida,cantidad_pagada,estado,pedidos_id,productos_id) VALUES (?,100,'p','pr',1,0,'enviado','p','pr')", [`i${n}`]);
    const db = { query(sql, params, cb) { if (typeof params === 'function') { cb = params; params = []; } c.query(sql, params).then(([rows]) => cb(null, rows), cb); } };
    const connection = { beginTransaction: () => c.beginTransaction(), commit: () => c.commit(), rollback: () => c.rollback(), end: async () => {}, query(sql, params) {
      if (fail && sql.includes('INSERT INTO kanban_movimientos') && ++writes === 2) throw new Error('Fallo segundo historial');
      return c.query(sql, params);
    } };
    const kanban = load('kanbanController.js', db, connection), pedidos = load('pedidosController.js', db, connection);
    const board = async () => (await invoke(kanban.obtenerPedidosAgrupados)).data.datos[0];
    const snapshot = async () => JSON.stringify((await c.query("SELECT cantidad_disponible,costo_promedio_ponderado FROM productos WHERE id='pr'"))[0]);
    const before = await snapshot();
    await t.test('10 líneas enviadas, una tarjeta, rechazo despacho antes de aceptar', async () => {
      assert.equal((await board()).items.length, 10); assert.equal((await board()).estado_derivado, 'enviado');
      assert.equal((await invoke(kanban.despacharTodo, {}, { id: 'p' })).status, 409); assert.equal(await snapshot(), before);
    });
    await t.test('aceptación atómica, repetición y lectura persistida', async () => {
      assert.equal((await invoke(kanban.aceptarPedido, {}, { id: 'p' })).data.items_aceptados, 10);
      assert.equal((await invoke(kanban.aceptarPedido, {}, { id: 'p' })).data.items_aceptados, 0);
      assert.equal((await board()).estado_derivado, 'preparando'); assert.equal(await snapshot(), before);
    });
    await t.test('servir una línea deriva parcial; cancelarla devuelve 409 sin stock', async () => {
      assert.equal((await invoke(kanban.actualizarEstadoPedido, { nuevo_estado: 'servido' }, { id: 'i0' })).status, 200);
      assert.equal((await board()).estado_derivado, 'parcialmente_servido');
      assert.equal((await invoke(pedidos.cancelarItemPedido, {}, { id: 'i0' })).status, 409); assert.equal(await snapshot(), before);
    });
    await t.test('cancelar preparación conserva reintegro y se excluye del estado', async () => {
      assert.equal((await invoke(pedidos.cancelarItemPedido, {}, { id: 'i1' })).status, 200);
      assert.equal((await c.query("SELECT cantidad_disponible FROM productos WHERE id='pr'"))[0][0].cantidad_disponible, 31);
    });
    await t.test('fallo intermedio de despacho revierte todas las líneas y el historial', async () => {
      const history = (await c.query('SELECT COUNT(*) AS n FROM kanban_movimientos'))[0][0].n;
      fail = true; assert.equal((await invoke(kanban.despacharTodo, {}, { id: 'p' })).status, 500); fail = false;
      assert.equal((await board()).items.filter(i => i.estado === 'preparando').length, 8);
      assert.equal((await c.query('SELECT COUNT(*) AS n FROM kanban_movimientos'))[0][0].n, history);
    });
    await t.test('despachar todo sirve ocho líneas, ignora cancelada/servida y es repetible', async () => {
      const stock = await snapshot();
      assert.equal((await invoke(kanban.despacharTodo, {}, { id: 'p' })).data.items_despachados, 8);
      assert.equal((await board()).estado_derivado, 'servido'); assert.equal(await snapshot(), stock);
      assert.equal((await invoke(kanban.despacharTodo, {}, { id: 'p' })).data.items_despachados, 0);
      assert.equal((await c.query("SELECT estado FROM pedido_items WHERE id='i1'"))[0][0].estado, 'cancelado');
    });
  } finally { await c.end(); }
});
