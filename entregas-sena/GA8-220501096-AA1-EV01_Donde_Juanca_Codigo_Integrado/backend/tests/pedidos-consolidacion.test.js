const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const { crear } = require('./helpers/comprasSandbox');
test('Consolidación real de pedidos, cantidades adicionales y concurrencia', { skip: process.env.RUN_MYSQL_CONSOLIDACION_TESTS !== '1' }, async t => {
  const sandbox = await crear(), c = sandbox.connection;
  let failMovement = false;
  const module = { exports: {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../src/controllers/pedidosController.js'), 'utf8'), {
    module, console: { error() {} }, require: name => {
      if (name === '../config/db') return { dbConfig: sandbox.config, query: (sql, params, cb) => c.query(sql, params).then(([rows]) => cb(null, rows), cb) };
      if (name === 'mysql2') return { createConnection: config => {
        const real = require('mysql2').createConnection(config).promise();
        return { promise: () => ({ beginTransaction: () => real.beginTransaction(), commit: () => real.commit(), rollback: () => real.rollback(), end: () => real.end(), query(sql, params) {
          if (failMovement && sql.includes('INSERT INTO movimientos_inventario')) throw new Error('Fallo de movimiento');
          return real.query(sql, params);
        } }) };
      } };
      return require(name.startsWith('.') ? path.join(__dirname, '../src/controllers', name) : name);
    },
  });
  const controller = module.exports;
  const add = (cantidad = 2, precio = 100, pedido = 'p1', producto = 'pr') => new Promise((resolve, reject) => {
    Promise.resolve(controller.agregarItemPedido({ usuario: { id: 'actor' }, params: { id_pedido: pedido }, body: { productos_id: producto, cantidad_pedida: cantidad, precio_unitario: precio } }, { status(code) { this.code = code; return this; }, json(data) { resolve({ status: this.code || 200, data }); } })).catch(reject);
  });
  const lines = async pedido => (await c.query('SELECT id,cantidad_pedida,estado FROM pedido_items WHERE pedidos_id=? ORDER BY id', [pedido || 'p1']))[0];
  const stock = async () => (await c.query("SELECT cantidad_disponible FROM productos WHERE id='pr'"))[0][0].cantidad_disponible;
  const reset = async () => {
    failMovement = false;
    await c.query('DELETE FROM movimientos_inventario'); await c.query('DELETE FROM pedido_items');
    await c.query("UPDATE productos SET cantidad_disponible=20 WHERE id='pr'");
  };
  try {
    await c.query("INSERT INTO usuarios(id,nombre,email,password_hash,estado,roles_id) VALUES ('actor','Actor','actor@example.invalid','test','activo',1),('responsable','Responsable','r@example.invalid','test','activo',1)");
    await c.query("INSERT INTO mesas(id,numero,estado,creado_en) VALUES ('m',1,'ocupada',NOW())");
    await c.query("INSERT INTO clientes(id,nombre,estado,usuarios_id) VALUES ('c','Cliente','activo','actor')");
    await c.query("INSERT INTO productos(id,nombre,codigo,precio_venta,costo_promedio_ponderado,cantidad_disponible,stock_minimo,estado,categorias_id,proveedores_id,historial_costos_id) VALUES ('pr','Producto','COD',100,50,20,1,'activo',1,'prov','hist')");
    for (const id of ['p1', 'p2']) await c.query("INSERT INTO pedidos(id,estado,creado_en,mesas_id,usuarios_id,clientes_id) VALUES (?,'abierto',NOW(),'m','responsable','c')", [id]);
    await t.test('2 + 2: mismo ID, una línea de 4 y segunda salida de solo 2', async () => {
      await reset(); const first = await add(); assert.equal(first.status, 201); assert.equal(await stock(), 18);
      const second = await add(); assert.equal(second.status, 201); assert.equal(second.data.id_item, first.data.id_item);
      assert.equal((await lines()).length, 1); assert.equal((await lines())[0].cantidad_pedida, 4); assert.equal(await stock(), 16);
      const detail = await new Promise(resolve => controller.obtenerPedidoConDetalles({ params: { id: 'p1' } }, { status() { return this; }, json(data) { resolve(data); } }));
      assert.equal(detail.datos.items.length, 1); assert.equal(detail.datos.items[0].cantidad_pedida, 4);
      const [movements] = await c.query('SELECT cantidad,stock_antes,stock_despues,usuarios_id,referencia_id FROM movimientos_inventario ORDER BY stock_antes DESC');
      assert.deepEqual(movements.map(m => [m.cantidad, m.stock_antes, m.stock_despues]), [[-2,20,18],[-2,18,16]]);
      assert.ok(movements.every(m => m.usuarios_id === 'actor' && m.referencia_id === 'p1'));
    });
    await t.test('consolida también preparando sin reiniciar su estado', async () => {
      await reset(); const first = await add(); await c.query("UPDATE pedido_items SET estado='preparando' WHERE id=?", [first.data.id_item]);
      assert.equal((await add()).data.id_item, first.data.id_item); assert.equal((await lines())[0].cantidad_pedida, 4); assert.equal((await lines())[0].estado, 'preparando');
    });
    await t.test('precio distinto genera una línea separada', async () => {
      await reset(); const first = await add(2,100); const second = await add(2,101);
      assert.notEqual(first.data.id_item, second.data.id_item); assert.equal((await lines()).length, 2); assert.equal(await stock(), 16);
    });
    for (const estado of ['servido','cancelado']) await t.test(`${estado} no se consolida`, async () => {
      await reset(); const first = await add(); await c.query('UPDATE pedido_items SET estado=? WHERE id=?', [estado, first.data.id_item]);
      assert.notEqual((await add()).data.id_item, first.data.id_item); assert.equal((await lines()).length, 2); assert.ok((await lines()).every(i => i.cantidad_pedida === 2));
    });
    await t.test('otro pedido no se consolida', async () => {
      await reset(); const first = await add(); const second = await add(2,100,'p2');
      assert.notEqual(first.data.id_item, second.data.id_item); assert.equal((await lines('p1'))[0].cantidad_pedida, 2); assert.equal((await lines('p2'))[0].cantidad_pedida, 2);
    });
    await t.test('fallo del movimiento revierte incremento y descuento', async () => {
      await reset(); await add(); failMovement = true; assert.equal((await add()).status, 500); failMovement = false;
      assert.equal((await lines())[0].cantidad_pedida, 2); assert.equal(await stock(), 18); assert.equal((await c.query('SELECT COUNT(*) AS n FROM movimientos_inventario'))[0][0].n, 1);
    });
    await t.test('stock insuficiente no incrementa ni registra movimiento', async () => {
      await reset(); await add(); assert.equal((await add(19)).status, 400); assert.equal((await lines())[0].cantidad_pedida, 2); assert.equal(await stock(), 18);
    });
    await t.test('dos conexiones concurrentes sin línea previa producen una línea de 4', async () => {
      await reset(); const results = await Promise.all([add(), add()]); assert.ok(results.every(r => r.status === 201));
      assert.equal(results[0].data.id_item, results[1].data.id_item); assert.equal((await lines()).length, 1); assert.equal((await lines())[0].cantidad_pedida, 4); assert.equal(await stock(), 16);
    });
  } finally { await sandbox.close(); }
});
