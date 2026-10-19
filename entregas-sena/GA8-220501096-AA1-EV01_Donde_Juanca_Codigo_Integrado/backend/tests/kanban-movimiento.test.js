const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const mysql = require('mysql2/promise');

test('movimiento Kanban contra MySQL con tablas temporales', {
  skip: process.env.RUN_MYSQL_KANBAN_TESTS !== '1'
}, async t => {
  require('dotenv').config({ path: path.join(__dirname, '../.env'), quiet: true });
  const real = await mysql.createConnection({
    host: process.env.DB_HOST, port: process.env.DB_PORT,
    user: process.env.DB_USER, password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME, connectTimeout: 5000
  });
  let fallo = null;
  const conexion = {
    beginTransaction: () => real.beginTransaction(),
    query: async (sql, params) => {
      if (fallo === 'sin-filas' && sql.startsWith('UPDATE pedido_items')) {
        return [{ affectedRows: 0, changedRows: 0 }];
      }
      if (fallo === 'historial' && sql.includes('INSERT INTO kanban_movimientos')) throw new Error('Fallo inyectado');
      return real.query(sql, params);
    },
    commit: async () => {
      if (fallo === 'commit') throw new Error('Fallo de commit inyectado');
      await real.commit();
    },
    rollback: () => real.rollback(),
    end: async () => {}
  };
  const modulo = { exports: {} };
  const tablas = ['pedido_items', 'pedidos', 'productos', 'mesas', 'usuarios', 'kanban_movimientos'];
  try {
    for (const tabla of tablas) {
      await real.query(`CREATE TEMPORARY TABLE copia_kanban_${tabla} LIKE ${tabla}`);
      await real.query(`CREATE TEMPORARY TABLE ${tabla} LIKE copia_kanban_${tabla}`);
    }
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../src/controllers/kanbanController.js'), 'utf8'), {
      module: modulo,
      require: nombre => {
        if (nombre === '../config/db') return {
          dbConfig: {}, query: (sql, cb) => real.query(sql).then(([r]) => cb(null, r), e => cb(e))
        };
        if (nombre === 'mysql2') return { createConnection: () => ({ promise: () => conexion }) };
        return (nombre === '../services/identidadService' ? require('../src/services/identidadService') : nombre === '../middleware/rolesMiddleware' ? require('../src/middleware/rolesMiddleware') : require(nombre));
      },
      console: { error() {} }
    });
    const mover = async (estado, id = 'test-item', usuario = 'test-user') => {
      let resultado;
      await modulo.exports.actualizarEstadoPedido({ params: { id }, usuario: {id:usuario}, body: { nuevo_estado: estado } }, {
        status(code) { this.code = code; return this; },
        json(data) { resultado = { status: this.code, data: JSON.parse(JSON.stringify(data)) }; }
      });
      return resultado;
    };
    const preparar = async (estado = 'enviado', estadoPedido = 'abierto') => {
      fallo = null;
      for (const tabla of tablas) await real.query(`DELETE FROM ${tabla}`);
      await real.query("INSERT INTO mesas (id,numero,estado,creado_en) VALUES ('test-mesa',99,'ocupada',NOW())");
      await real.query(`INSERT INTO usuarios (id,nombre,email,password_hash,estado,roles_id)
        VALUES ('test-user','Prueba','kanban-test@example.invalid','test','activo',1)`);
      await real.query(`INSERT INTO productos
        (id,nombre,codigo,precio_venta,costo_promedio_ponderado,cantidad_disponible,stock_minimo,estado,categorias_id,proveedores_id,historial_costos_id)
        VALUES ('test-producto','Producto prueba','TEST-KANBAN',100,50,10,1,'activo',1,'test-prov','test-costo')`);
      await real.query(`INSERT INTO pedidos (id,estado,creado_en,mesas_id,usuarios_id,clientes_id)
        VALUES ('test-pedido',?,NOW(),'test-mesa','test-user','test-cliente')`, [estadoPedido]);
      await real.query(`INSERT INTO pedido_items
        (id,precio_unitario,pedido_id,producto_id,cantidad_pedida,cantidad_pagada,estado,pedidos_id,productos_id)
        VALUES ('test-item',100,'test-pedido','test-producto',3,1,?,'test-pedido','test-producto')`, [estado]);
    };
    await t.test('secuencia real, alias del tablero y lectura después del commit', async () => {
      await preparar();
      let r = await mover('preparacion');
      assert.equal(r.status, 200);
      assert.equal(r.data.estado_actual, 'preparando');
      assert.equal(r.data.pedido_id, 'test-pedido');
      assert.equal(r.data.tarjeta.id_item, 'test-item');
      assert.equal(r.data.tarjeta.cantidad, 3);
      assert.equal(r.data.tarjeta.cantidad_pagada, 1);
      let [[item]] = await real.query("SELECT estado FROM pedido_items WHERE id='test-item'");
      assert.equal(item.estado, 'preparando');
      const tablero = await new Promise(resolve => modulo.exports.obtenerTableroKanban({}, {
        status() { return this; }, json(data) { resolve(data); }
      }));
      assert.equal(tablero.data.preparacion[0].id_item, 'test-item');
      r = await mover('servido');
      assert.equal(r.status, 200);
      [[item]] = await real.query("SELECT estado,cantidad_pedida,cantidad_pagada FROM pedido_items WHERE id='test-item'");
      assert.equal(item.estado, 'servido');
      assert.equal(item.cantidad_pedida, 3);
      assert.equal(item.cantidad_pagada, 1);
      const [historial] = await real.query('SELECT estado_anterior,usuarios_id FROM kanban_movimientos ORDER BY creado_en,id');
      assert.equal(historial.length, 2);
      assert.deepEqual(historial.map(h => h.estado_anterior).sort(), ['enviado', 'preparando']);
      assert.ok(historial.every(h => h.usuarios_id === 'test-user'));
    });
    await t.test('404 y estados, usuarios y transiciones inválidos', async () => {
      await preparar();
      assert.equal((await mover('preparando', 'inexistente')).status, 404);
      for (const estado of ['pendiente', 'en_preparacion', 'entregado', 'listo', 'cancelado', 'servido', 'enviado']) {
        assert.equal((await mover(estado)).status, 400);
      }
      assert.equal((await mover('preparando', 'test-item', '')).status, 401);
      assert.equal((await mover('preparando', 'test-item', 'inexistente')).status, 400);
      const [[n]] = await real.query('SELECT COUNT(*) AS n FROM kanban_movimientos');
      assert.equal(n.n, 0);
    });
    await t.test('no reabrir terminales ni mover pedidos cerrados o cancelados', async () => {
      for (const estado of ['servido', 'cancelado']) {
        await preparar(estado);
        assert.equal((await mover('preparando')).status, 400);
      }
      for (const estadoPedido of ['cerrado', 'cancelado']) {
        await preparar('enviado', estadoPedido);
        assert.equal((await mover('preparando')).status, 409);
      }
    });
    await t.test('repetición no genera otro movimiento', async () => {
      await preparar();
      assert.equal((await mover('preparando')).status, 200);
      assert.equal((await mover('preparando')).status, 400);
      const [[n]] = await real.query('SELECT COUNT(*) AS n FROM kanban_movimientos');
      assert.equal(n.n, 1);
    });
    await t.test('rollback ante cero filas, fallo de historial y fallo de commit', async () => {
      for (const tipo of ['sin-filas', 'historial', 'commit']) {
        await preparar(); fallo = tipo;
        assert.equal((await mover('preparando')).status, tipo === 'sin-filas' ? 409 : 500);
        const [[item]] = await real.query("SELECT estado FROM pedido_items WHERE id='test-item'");
        const [[n]] = await real.query('SELECT COUNT(*) AS n FROM kanban_movimientos');
        assert.equal(item.estado, 'enviado');
        assert.equal(n.n, 0);
      }
    });
  } finally {
    await real.end();
  }
});
