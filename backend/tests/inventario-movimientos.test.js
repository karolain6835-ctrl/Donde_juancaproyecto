const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const mysql = require('mysql2/promise');

test('trazabilidad y lectura contra MySQL con tablas temporales', {
  skip: process.env.RUN_MYSQL_INVENTARIO_TESTS !== '1'
}, async t => {
  require('dotenv').config({ path: path.join(__dirname, '../.env'), quiet: true });
  const real = await mysql.createConnection({
    host: process.env.DB_HOST, port: process.env.DB_PORT, user: process.env.DB_USER,
    password: process.env.DB_PASSWORD, database: process.env.DB_NAME, connectTimeout: 5000
  });
  let fallo = null;
  const conexion = {
    beginTransaction: () => real.beginTransaction(),
    query: async (sql, params) => {
      if (sql.includes('INSERT INTO movimientos_inventario')) {
        if (fallo === 'insert') throw new Error('Fallo de movimiento inyectado');
        if (fallo === 'cero') return [{ affectedRows: 0 }];
      }
      if (fallo === 'lectura' && sql.includes('LEFT JOIN productos')) throw new Error('Fallo de lectura inyectado');
      return real.query(sql, params);
    },
    commit: () => real.commit(), rollback: () => real.rollback(), end: async () => {}
  };
  const cargar = archivo => {
    const modulo = { exports: {} };
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../src/controllers', archivo), 'utf8'), {
      module: modulo, exports: modulo.exports,
      require: nombre => nombre === '../config/db' ? { dbConfig: {} }
        : nombre === 'mysql2' ? { createConnection: () => ({ promise: () => conexion }) } : require(nombre),
      console: { error() {} }
    });
    return modulo.exports;
  };
  const ejecutar = async (fn, req) => {
    let resultado;
    await fn(req, { code: 200, status(code) { this.code = code; return this; },
      json(data) { resultado = { status: this.code, data: JSON.parse(JSON.stringify(data)) }; } });
    return resultado;
  };
  try {
    for (const tabla of ['productos', 'usuarios', 'pedidos', 'pedido_items', 'movimientos_inventario']) {
      await real.query(`CREATE TEMPORARY TABLE copia_traza_${tabla} LIKE ${tabla}`);
      await real.query(`CREATE TEMPORARY TABLE ${tabla} LIKE copia_traza_${tabla}`);
    }
    const [columnas] = await real.query('SHOW COLUMNS FROM movimientos_inventario');
    if (columnas.some(c => c.Field === 'creado_en')) {
      const [indices] = await real.query('SHOW INDEX FROM movimientos_inventario');
      if (indices.some(i => i.Key_name === 'idx_movimientos_fecha_id')) await real.query('ALTER TABLE movimientos_inventario DROP INDEX idx_movimientos_fecha_id');
      await real.query('ALTER TABLE movimientos_inventario DROP COLUMN creado_en, DROP COLUMN referencia_id');
    }
    await real.query(`INSERT INTO movimientos_inventario
      (id,tipo,cantidad,stock_antes,stock_despues,referencia_tipo,productos_id,usuarios_id)
      VALUES ('historico','ajuste',1,0,1,'ajuste','p1','u1')`);
    await t.test('migracion preserva historicos sin fecha ni referencia', async () => {
      await real.query(fs.readFileSync(path.join(__dirname, '../database/v2.22_movimientos_inventario_trazabilidad.sql'), 'utf8'));
      const [[h]] = await real.query("SELECT creado_en,referencia_id FROM movimientos_inventario WHERE id='historico'");
      assert.equal(h.creado_en, null); assert.equal(h.referencia_id, null);
    });
    for (const id of ['u1', 'u2']) await real.query(`INSERT INTO usuarios (id,nombre,email,password_hash,estado,roles_id)
      VALUES (?, ?, ?, 'fixture','activo',1)`, [id, `Usuario ${id}`, `${id}@example.invalid`]);
    for (const id of ['p1', 'p2']) await real.query(`INSERT INTO productos
      (id,nombre,codigo,precio_venta,costo_promedio_ponderado,cantidad_disponible,stock_minimo,estado,categorias_id,proveedores_id,historial_costos_id)
      VALUES (?,?,?,100,50,27,1,'activo',1,'prov-test','hist-test')`, [id, `Producto ${id}`, `COD-${id}`]);
    await real.query(`INSERT INTO pedidos (id,estado,creado_en,mesas_id,usuarios_id,clientes_id)
      VALUES ('pedido-test','abierto',NOW(),'mesa-test','u1','cliente-test')`);
    const pedidos = cargar('pedidosController.js');
    const inventario = cargar('inventarioController.js');
    const agregar = () => ejecutar(pedidos.agregarItemPedido, {
      params: { id_pedido: 'pedido-test' }, body: { productos_id: 'p1', cantidad_pedida: 3, precio_unitario: 100 }
    });
    const cancelar = id => ejecutar(pedidos.cancelarItemPedido, { params: { id } });
    const listar = (query = {}) => ejecutar(inventario.obtenerMovimientos, { query });
    const preparar = async () => {
      fallo = null;
      await real.query('DELETE FROM pedido_items');
      await real.query('DELETE FROM movimientos_inventario');
      await real.query('UPDATE productos SET cantidad_disponible=27');
    };
    const cantidad = async () => (await real.query("SELECT cantidad_disponible AS n FROM productos WHERE id='p1'"))[0][0].n;
    const movimientos = async () => (await real.query('SELECT * FROM movimientos_inventario'))[0];
    await t.test('salida, reintegro, referencias, responsable y doble cancelacion', async () => {
      await preparar(); const r = await agregar(); assert.equal(r.status, 201);
      assert.equal(await cantidad(), 24);
      let [m] = await movimientos();
      assert.equal(m.tipo, 'venta'); assert.equal(m.cantidad, -3);
      assert.equal(m.stock_antes, 27); assert.equal(m.stock_despues, 24);
      assert.equal(m.referencia_tipo, 'pedido'); assert.equal(m.referencia_id, 'pedido-test');
      assert.equal(m.usuarios_id, 'u1'); assert.ok(m.creado_en);
      assert.equal((await cancelar(r.data.id_item)).status, 200);
      assert.equal(await cantidad(), 27);
      m = (await movimientos()).find(x => x.cantidad > 0);
      assert.equal(m.tipo, 'venta'); assert.equal(m.cantidad, 3);
      assert.equal(m.stock_antes, 24); assert.equal(m.stock_despues, 27);
      assert.equal(m.referencia_id, 'pedido-test'); assert.equal(m.usuarios_id, 'u1'); assert.ok(m.creado_en);
      assert.equal((await cancelar(r.data.id_item)).status, 400);
      assert.equal(await cantidad(), 27); assert.equal((await movimientos()).length, 2);
    });
    for (const modo of ['insert', 'cero']) {
      await t.test(`rollback salida por fallo movimiento ${modo}`, async () => {
        await preparar(); fallo = modo;
        assert.equal((await agregar()).status, 500);
        assert.equal(await cantidad(), 27); assert.equal((await movimientos()).length, 0);
        const [[n]] = await real.query('SELECT COUNT(*) AS n FROM pedido_items'); assert.equal(n.n, 0);
      });
      await t.test(`rollback cancelacion por fallo movimiento ${modo}`, async () => {
        await preparar(); const r = await agregar(); fallo = modo;
        assert.equal((await cancelar(r.data.id_item)).status, 500);
        assert.equal(await cantidad(), 24); assert.equal((await movimientos()).length, 1);
        const [[i]] = await real.query('SELECT estado FROM pedido_items WHERE id=?', [r.data.id_item]);
        assert.equal(i.estado, 'preparando');
      });
    }
    const fixtures = async () => {
      await preparar();
      for (const [id, tipo, producto, usuario, fecha] of [
        ['a','venta','p1','u1','2026-10-01 12:00:00'],
        ['b','ajuste','p1','u2','2026-10-02 12:00:00'],
        ['c','venta','p2','u1','2026-10-02 12:00:00'],
        ['d','compra','p2','u2',null], ['e','merma','p2','u2',null]
      ]) await real.query(`INSERT INTO movimientos_inventario
        (id,tipo,cantidad,stock_antes,stock_despues,referencia_tipo,productos_id,usuarios_id,creado_en)
        VALUES (?,?,1,26,27,'ajuste',?,?,?)`, [id,tipo,producto,usuario,fecha]);
    };
    await t.test('GET sin filtros, orden fecha/id, campos y fechas NULL', async () => {
      await fixtures(); const r = await listar(); assert.equal(r.status, 200);
      assert.deepEqual(r.data.datos.map(m => m.id), ['c','b','a','e','d']);
      assert.deepEqual(r.data.paginacion, { pagina: 1, limite: 20, total: 5, total_paginas: 1 });
      assert.equal(r.data.datos[0].producto_nombre, 'Producto p2');
      assert.equal(r.data.datos[0].producto_codigo, 'COD-p2');
      assert.equal(r.data.datos[0].usuario_nombre, 'Usuario u1');
      assert.equal(r.data.datos[0].creado_en, '2026-10-02T12:00:00Z');
      assert.equal(r.data.datos[3].creado_en, null);
      assert.deepEqual(Object.keys(r.data.datos[0]).sort(), ['id','tipo','cantidad','stock_antes','stock_despues',
        'referencia_tipo','referencia_id','creado_en','productos_id','producto_nombre','producto_codigo','usuarios_id','usuario_nombre'].sort());
    });
    await t.test('filtros individuales y combinados comparten conteo', async () => {
      await fixtures();
      for (const [q, ids] of [[{producto_id:'p1'},['b','a']], [{tipo:'venta'},['c','a']],
        [{usuarios_id:'u2'},['b','e','d']], [{producto_id:'p1',tipo:'venta',usuarios_id:'u1'},['a']]]) {
        const r = await listar(q); assert.equal(r.status, 200);
        assert.deepEqual(r.data.datos.map(m => m.id), ids); assert.equal(r.data.paginacion.total, ids.length);
      }
    });
    await t.test('paginacion y respuesta vacia', async () => {
      await fixtures(); let r = await listar({pagina:'2',limite:'2'});
      assert.deepEqual(r.data.datos.map(m => m.id), ['a','e']);
      assert.deepEqual(r.data.paginacion, {pagina:2,limite:2,total:5,total_paginas:3});
      r = await listar({producto_id:'no-existe'}); assert.equal(r.status, 200);
      assert.deepEqual(r.data.datos, []); assert.equal(r.data.paginacion.total_paginas, 0);
      r = await listar({pagina:'9'}); assert.deepEqual(r.data.datos, []); assert.equal(r.data.paginacion.total, 5);
    });
    await t.test('parametros invalidos y fallo SQL de lectura', async () => {
      await fixtures();
      for (const q of [{pagina:'0'}, {pagina:'-1'}, {pagina:'1.5'}, {pagina:'abc'}, {limite:'0'}, {limite:'101'},
        {limite:''}, {tipo:'devolucion'}, {tipo:['venta','ajuste']}, {producto_id:{}}, {usuarios_id:''},
        {fecha_desde:'2026-01-01'}, {pagina:'9007199254740991',limite:'100'}, {producto_id:'x'.repeat(37)}]) {
        assert.equal((await listar(q)).status, 400);
      }
      fallo = 'lectura'; assert.equal((await listar()).status, 500);
    });
  } finally {
    await real.rollback(); await real.end();
  }
});
