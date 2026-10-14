const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
function load(file, db, overrides = {}) {
  const module = { exports: {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../src/controllers', file), 'utf8'), {
    module, exports: module.exports, console: { error() {} },
    require: name => Object.hasOwn(overrides, name) ? overrides[name] : name === '../config/db' ? db : require(name.startsWith('.') ? path.join(__dirname, '../src/controllers', name) : name),
  });
  return module.exports;
}
function call(controller, query = {}) {
  return new Promise(resolve => controller({ query }, { status(code) { this.code = code; return this; }, json(body) { resolve({ status: this.code || 200, body }); } }));
}
test('Listado pedidos valida filtros/paginación antes de consultar', async () => {
  const controller = load('pedidosController.js', { query() { assert.fail('No debe consultar'); } });
  for (const query of [{ pagina: '0' }, { limite: '101' }, { estado: 'preparando' }, { mesas_id: ' ' }, { mesas_id: ['m1'] }, { otro: '1' }, { pagina: '999999999999999999' }]) assert.equal((await call(controller.listarPedidos, query)).status, 400);
});
test('Listado pedidos usa referencias reales, joins de nombres y filtros parametrizados', async () => {
  const queries = [];
  const controller = load('pedidosController.js', { query(sql, params, callback) {
    queries.push({ sql, params });
    callback(null, sql.includes('COUNT(*)') ? [{ total: 1 }] : [{ id: 'pedido-real', mesas_id: 'm1', usuarios_id: 'responsable-distinto', clientes_id: 'c1', estado: 'abierto', mesa_numero: 7, cliente_nombre: 'Cliente real', responsable_nombre: 'Responsable real' }]);
  } });
  const result = await call(controller.listarPedidos, { estado: 'abierto', mesas_id: 'm1', pagina: '2', limite: '10' });
  assert.equal(result.status, 200); assert.equal(result.body.datos[0].usuarios_id, 'responsable-distinto');
  assert.equal(result.body.paginacion.total, 1); assert.equal(result.body.paginacion.pagina, 2);
  assert.equal(JSON.stringify(queries[1].params), JSON.stringify(['abierto', 'm1', 10, 10]));
  assert.match(queries[1].sql, /LEFT JOIN usuarios/); assert.doesNotMatch(queries[1].sql, /password|email|INSERT|UPDATE/i);
});
test('Listado pedidos conserva vacío y errores de ambas consultas', async () => {
  for (const failAt of [null, 1, 2]) {
    let n = 0;
    const controller = load('pedidosController.js', { query(sql, params, callback) {
      n++; callback(failAt === n ? new Error('SQL') : null, sql.includes('COUNT(*)') ? [{ total: 0 }] : []);
    } });
    const result = await call(controller.listarPedidos);
    assert.equal(result.status, failAt ? 500 : 200);
    if (!failAt) { assert.equal(result.body.datos.length, 0); assert.equal(result.body.paginacion.total_paginas, 0); }
  }
});
test('Responsables solo expone id/nombre/estado de usuarios activos', async () => {
  let sql;
  const controller = load('usuariosController.js', { query(statement, callback) { sql = statement; callback(null, [{ id: 'u2', nombre: 'Responsable', estado: 'activo' }]); } });
  const result = await call(controller.listarResponsables);
  assert.equal(result.status, 200); assert.equal(result.body.datos[0].id, 'u2');
  assert.match(sql, /SELECT id,nombre,estado/); assert.match(sql, /estado='activo'/); assert.doesNotMatch(sql, /password|email|roles_id/i);
  assert.equal((await call(controller.listarResponsables, { otro: '1' })).status, 400);
});
test('Responsables conserva vacío y fallo de SQL', async () => {
  for (const error of [null, new Error('SQL')]) {
    const controller = load('usuariosController.js', { query(sql, callback) { callback(error, []); } });
    const result = await call(controller.listarResponsables);
    assert.equal(result.status, error ? 500 : 200);
    if (!error) assert.equal(result.body.datos.length, 0);
  }
});
test('Aceptar pedido valida identidad, ID y body sin consultar ni permitir actor manual', async () => {
  const kanban = load('kanbanController.js', { query() { assert.fail('No debe consultar'); } });
  const invoke = (body, id = 'pedido-real', usuario = { id: 'u1' }) => new Promise(resolve => {
    kanban.aceptarPedido({ body, params: { id }, usuario }, { status(code) { this.code = code; return this; }, json(data) { resolve({ status: this.code || 200, data }); } });
  });
  assert.equal((await invoke({}, 'pedido-real', null)).status, 401);
  for (const body of [null, [], { usuarios_id: 'otro' }, { nuevo_estado: 'servido' }]) assert.equal((await invoke(body)).status, 400);
  assert.equal((await invoke({}, ' ')).status, 400);
});
test('Lecturas reales con tablas MySQL temporales y pedido sin ítems', { skip: process.env.RUN_MYSQL_OPERACION_TESTS !== '1' }, async t => {
  require('dotenv').config({ path: path.join(__dirname, '../.env'), quiet: true });
  const c = await require('mysql2/promise').createConnection({ host: process.env.DB_HOST, port: process.env.DB_PORT, user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME });
  try {
    for (const table of ['usuarios', 'mesas', 'clientes', 'pedidos']) {
      await c.query(`CREATE TEMPORARY TABLE copia_operacion_${table} LIKE ${table}`);
      await c.query(`CREATE TEMPORARY TABLE ${table} LIKE copia_operacion_${table}`);
    }
    await c.query("INSERT INTO usuarios(id,nombre,email,password_hash,estado,roles_id) VALUES ('u1','Ejecutor','u1@example.invalid','no-login','activo',1),('u2','Responsable real','u2@example.invalid','no-login','activo',1),('u3','Inactivo','u3@example.invalid','no-login','inactivo',1)");
    await c.query("INSERT INTO mesas(id,numero,estado,creado_en) VALUES ('m1',7,'disponible',NOW())");
    await c.query("INSERT INTO clientes(id,nombre,estado,usuarios_id) VALUES ('c1','Cliente real','activo','u1')");
    await c.query("INSERT INTO pedidos(id,estado,creado_en,mesas_id,usuarios_id,clientes_id) VALUES ('pedido-vacio','abierto',NOW(),'m1','u2','c1')");
    const db = { query(sql, params, callback) {
      if (typeof params === 'function') { callback = params; params = []; }
      c.query(sql, params).then(([rows]) => callback(null, rows), callback);
    } };
    const pedidos = load('pedidosController.js', db), usuarios = load('usuariosController.js', db);
    await t.test('pedido sin ítems se lista con cliente, mesa y responsable distintos del ejecutor', async () => {
      const result = await call(pedidos.listarPedidos, { mesas_id: 'm1', estado: 'abierto' });
      assert.equal(result.body.datos[0].id, 'pedido-vacio'); assert.equal(result.body.datos[0].mesa_numero, 7); assert.equal(result.body.datos[0].responsable_nombre, 'Responsable real');
    });
    await t.test('catálogo real excluye inactivos y datos privados', async () => {
      const result = await call(usuarios.listarResponsables);
      assert.equal(result.body.datos.length, 2); assert.deepEqual(Object.keys(result.body.datos[0]).sort(), ['estado', 'id', 'nombre']);
    });
    await t.test('flujo persistido: crear → agregar → Kanban → servir → cancelar/reintegrar', async () => {
      for (const table of ['productos', 'pedido_items', 'movimientos_inventario', 'kanban_movimientos']) {
        await c.query(`CREATE TEMPORARY TABLE copia_flujo_${table} LIKE ${table}`);
        await c.query(`CREATE TEMPORARY TABLE ${table} LIKE copia_flujo_${table}`);
      }
      await require('./helpers/participantesTemporales')(c, { pedidos: true, items: true });
      await c.query("INSERT INTO productos(id,nombre,codigo,precio_venta,costo_promedio_ponderado,cantidad_disponible,stock_minimo,estado,categorias_id,proveedores_id,historial_costos_id) VALUES ('producto-real','Poker prueba 330ml','CERV-005',3500,2844.44,6,1,'activo',1,'prov','hist')");
      let failAcceptance = false, historyWrites = 0;
      const conexion = { query: (sql, params) => {
        if (failAcceptance && sql.includes('INSERT INTO kanban_movimientos') && ++historyWrites === 2) throw new Error('Fallo en el segundo historial');
        return c.query(sql, params);
      }, beginTransaction: () => c.beginTransaction(), commit: () => c.commit(), rollback: () => c.rollback(), end: async () => {} };
      const actual = load('pedidosController.js', db, { mysql2: { createConnection: () => ({ promise: () => conexion }) } });
      const kanban = load('kanbanController.js', db, { mysql2: { createConnection: () => ({ promise: () => conexion }) } });
      const invoke = (controller, body = {}, params = {}) => new Promise((resolve, reject) => {
        Promise.resolve(controller({ body, params, query: {}, usuario: { id: 'u1' } }, { status(code) { this.code = code; return this; }, json(data) { resolve({ status: this.code || 200, data }); } })).catch(reject);
      });
      const created = await invoke(actual.crearPedido, { mesas_id: 'm1', usuarios_id: 'u2', clientes_id: 'c1' });
      assert.equal(created.status, 201);
      assert.equal((await invoke(kanban.aceptarPedido, {}, { id: 'inexistente' })).status, 404);
      const [[order]] = await c.query('SELECT usuarios_id FROM pedidos WHERE id=?', [created.data.id_pedido]); assert.equal(order.usuarios_id, 'u2');
      const added = await invoke(actual.agregarItemPedido, { productos_id: 'producto-real', cantidad_pedida: 2, precio_unitario: 3500 }, { id_pedido: created.data.id_pedido });
      assert.equal(added.status, 201); assert.equal(added.data.stock_restante, 4);
      const [[movement]] = await c.query('SELECT usuarios_id,cantidad FROM movimientos_inventario WHERE referencia_id=?', [created.data.id_pedido]); assert.equal(movement.usuarios_id, 'u1'); assert.equal(movement.cantidad, -2);
      let board = await invoke(kanban.obtenerTableroKanban);
      assert.equal(board.data.data.enviado[0].id_item, added.data.id_item);
      const second = await invoke(actual.agregarItemPedido, { productos_id: 'producto-real', cantidad_pedida: 1, precio_unitario: 3600 }, { id_pedido: created.data.id_pedido });
      assert.equal(second.status, 201);
      assert.equal((await invoke(kanban.actualizarEstadoPedido, { nuevo_estado: 'servido' }, { id: added.data.id_item })).status, 400);
      const stockSnapshot = async () => (await c.query("SELECT cantidad_disponible,costo_promedio_ponderado FROM productos WHERE id='producto-real'"))[0][0];
      const before = await stockSnapshot();
      assert.equal(before.cantidad_disponible, 3);
      failAcceptance = true;
      assert.equal((await invoke(kanban.aceptarPedido, {}, { id: created.data.id_pedido })).status, 500);
      failAcceptance = false;
      board = await invoke(kanban.obtenerTableroKanban); assert.equal(board.data.data.enviado.length, 2);
      assert.equal((await c.query('SELECT * FROM kanban_movimientos'))[0].length, 0);
      const accepted = await invoke(kanban.aceptarPedido, {}, { id: created.data.id_pedido });
      assert.equal(accepted.status, 200); assert.equal(accepted.data.items_aceptados, 2);
      assert.deepEqual(await stockSnapshot(), before);
      board = await invoke(kanban.obtenerTableroKanban); assert.equal(board.data.data.enviado.length, 0); assert.equal(board.data.data.preparacion.length, 2);
      assert.equal((await invoke(kanban.aceptarPedido, {}, { id: created.data.id_pedido })).data.items_aceptados, 0);
      assert.equal((await c.query('SELECT * FROM kanban_movimientos'))[0].length, 2);
      const moved = await invoke(kanban.actualizarEstadoPedido, { nuevo_estado: 'servido' }, { id: added.data.id_item }); assert.equal(moved.status, 200);
      assert.deepEqual(await stockSnapshot(), before);
      board = await invoke(kanban.obtenerTableroKanban); assert.equal(board.data.data.servido[0].id_item, added.data.id_item);
      const [[persisted]] = await c.query('SELECT estado FROM pedido_items WHERE id=?', [added.data.id_item]); assert.equal(persisted.estado, 'servido');
      const cancelled = await invoke(actual.cancelarItemPedido, {}, { id: added.data.id_item }); assert.equal(cancelled.status, 409);
      assert.deepEqual(await stockSnapshot(), before);
      assert.equal((await invoke(actual.cancelarItemPedido, {}, { id: second.data.id_item })).status, 200);
      const [[stock]] = await c.query("SELECT cantidad_disponible FROM productos WHERE id='producto-real'"); assert.equal(stock.cantidad_disponible, 4);
      board = await invoke(kanban.obtenerTableroKanban); assert.equal(board.data.data.servido.length, 1);
      await c.query("UPDATE pedidos SET estado='cerrado' WHERE id=?", [created.data.id_pedido]);
      assert.equal((await invoke(kanban.aceptarPedido, {}, { id: created.data.id_pedido })).status, 409);
    });
  } finally { await c.end(); }
});
