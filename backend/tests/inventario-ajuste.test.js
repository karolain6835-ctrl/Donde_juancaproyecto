const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const mysql = require('mysql2/promise');

test('ajuste de inventario contra MySQL con tablas temporales', {
  skip: process.env.RUN_MYSQL_INVENTARIO_TESTS !== '1'
}, async t => {
  require('dotenv').config({ path: path.join(__dirname, '../.env'), quiet: true });
  const real = await mysql.createConnection({
    host: process.env.DB_HOST, port: process.env.DB_PORT,
    user: process.env.DB_USER, password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME, connectTimeout: 5000
  });
  let fallo = null;
  let cierres = 0;
  let commits = 0;
  const conexion = {
    beginTransaction: () => real.beginTransaction(),
    query: async (sql, params) => {
      const operacion = sql.includes('INSERT INTO movimientos_inventario') ? 'insert'
        : sql.startsWith('UPDATE productos') ? 'update' : null;
      if (operacion && fallo === operacion) throw new Error('Fallo SQL inyectado');
      if (operacion && fallo === `${operacion}-cero`) return [{ affectedRows: 0 }];
      return real.query(sql, params);
    },
    commit: async () => {
      if (fallo === 'commit') throw new Error('Fallo commit inyectado');
      await real.commit(); commits++;
    },
    rollback: () => real.rollback(),
    end: async () => { cierres++; }
  };
  const cargar = archivo => {
    const modulo = { exports: {} };
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../src/controllers', archivo), 'utf8'), {
      module: modulo, exports: modulo.exports,
      require: nombre => {
        if (nombre === '../config/db') return {
          dbConfig: {},
          query: (sql, params, cb) => real.query(sql, params).then(([r]) => cb(null, r), e => cb(e))
        };
        if (nombre === 'mysql2') return { createConnection: () => ({ promise: () => conexion }) };
        return require(nombre);
      },
      console: { error() {} }
    });
    return modulo.exports;
  };
  const ejecutar = (controlador, body, params = {}) => new Promise((resolve, reject) => {
    Promise.resolve(controlador({ body, params }, {
      code: 200,
      status(code) { this.code = code; return this; },
      json(data) { resolve({ status: this.code, data: JSON.parse(JSON.stringify(data)) }); }
    })).catch(reject);
  });
  try {
    for (const tabla of ['productos', 'usuarios', 'movimientos_inventario']) {
      await real.query(`CREATE TEMPORARY TABLE copia_ajuste_${tabla} LIKE ${tabla}`);
      await real.query(`CREATE TEMPORARY TABLE ${tabla} LIKE copia_ajuste_${tabla}`);
    }
    const [columnas] = await real.query('SHOW COLUMNS FROM movimientos_inventario');
    if (!columnas.some(c => c.Field === 'creado_en')) {
      await real.query(fs.readFileSync(path.join(__dirname, '../database/v2.22_movimientos_inventario_trazabilidad.sql'), 'utf8'));
    }
    await real.query(`INSERT INTO usuarios (id,nombre,email,password_hash,estado,roles_id)
      VALUES ('test-user','Prueba','ajuste@example.invalid','fixture','activo',1)`);
    await real.query(`INSERT INTO productos
      (id,nombre,codigo,precio_venta,costo_promedio_ponderado,cantidad_disponible,stock_minimo,estado,categorias_id,proveedores_id,historial_costos_id)
      VALUES ('test-producto','Producto','TEST-AJUSTE',100,50,27,1,'activo',1,'test-prov','test-costo')`);
    const inventario = cargar('inventarioController.js');
    const productos = cargar('productosController.js');
    const body = cantidad => ({ producto_id: 'test-producto', nueva_cantidad: cantidad, usuarios_id: 'test-user' });
    const ajustar = datos => ejecutar(inventario.actualizarStock, datos);
    const leer = async () => {
      const [[p]] = await real.query("SELECT cantidad_disponible FROM productos WHERE id='test-producto'");
      const [m] = await real.query('SELECT * FROM movimientos_inventario');
      return { cantidad: p.cantidad_disponible, movimientos: m };
    };
    const preparar = async () => {
      fallo = null;
      await real.query('DELETE FROM movimientos_inventario');
      await real.query("UPDATE productos SET cantidad_disponible=27 WHERE id='test-producto'");
    };
    for (const [nombre, cantidad] of [['aumento', 30], ['disminucion', 20], ['cero', 0]]) {
      await t.test(nombre, async () => {
        await preparar();
        const r = await ajustar(body(cantidad));
        assert.equal(r.status, 200);
        assert.equal(r.data.stock_anterior, 27);
        assert.equal(r.data.stock_actual, cantidad);
        assert.equal(r.data.diferencia, cantidad - 27);
        const estado = await leer();
        assert.equal(estado.cantidad, cantidad);
        assert.equal(estado.movimientos.length, 1);
        const m = estado.movimientos[0];
        assert.equal(m.tipo, 'ajuste'); assert.equal(m.referencia_tipo, 'ajuste');
        assert.equal(m.cantidad, cantidad - 27);
        assert.equal(m.stock_antes, 27); assert.equal(m.stock_despues, cantidad);
        assert.equal(m.productos_id, 'test-producto'); assert.equal(m.usuarios_id, 'test-user');
        assert.ok(m.creado_en); assert.equal(m.referencia_id, null);
        assert.match(m.id, /^[0-9a-f-]{36}$/);
      });
    }
    await t.test('mismo valor sin movimiento ni commit', async () => {
      await preparar(); const antes = commits;
      const r = await ajustar(body(27));
      assert.equal(r.status, 200); assert.equal(r.data.diferencia, 0);
      assert.equal((await leer()).movimientos.length, 0); assert.equal(commits, antes);
    });
    await t.test('producto y usuario inexistentes', async () => {
      await preparar();
      assert.equal((await ajustar({ ...body(30), producto_id: 'inexistente' })).status, 404);
      assert.equal((await ajustar({ ...body(30), usuarios_id: 'inexistente' })).status, 404);
      assert.deepEqual(await leer(), { cantidad: 27, movimientos: [] });
    });
    await t.test('cantidades invalidas y campos obligatorios', async () => {
      await preparar();
      for (const valor of [-1, 1.5, '20', null, undefined, true, {}, [], 2147483648]) {
        assert.equal((await ajustar(body(valor))).status, 400);
      }
      for (const campo of ['producto_id', 'nueva_cantidad', 'usuarios_id']) {
        const datos = body(30); delete datos[campo];
        assert.equal((await ajustar(datos)).status, 400);
      }
      assert.deepEqual(await leer(), { cantidad: 27, movimientos: [] });
    });
    for (const modo of ['insert', 'update', 'insert-cero', 'update-cero', 'commit']) {
      await t.test(`rollback ante fallo ${modo}`, async () => {
        await preparar(); fallo = modo; const antes = cierres;
        assert.equal((await ajustar(body(30))).status, 500);
        assert.deepEqual(await leer(), { cantidad: 27, movimientos: [] });
        assert.equal(cierres, antes + 1);
      });
    }
    await t.test('edicion general conserva existencia con cantidad diferente u omitida', async () => {
      await preparar();
      const datos = { nombre: 'Renombrado', codigo: 'TEST-AJUSTE', precio_venta: 150,
        costo_promedio: 60, stock_minimo: 2, estado: 'activo', categorias_id: 1,
        proveedores_id: 'test-prov', historial_costos_id: 'test-costo' };
      let r = await ejecutar(productos.actualizarProducto, { ...datos, cantidad: 0 }, { id: 'test-producto' });
      assert.equal(r.status, 200); assert.match(r.data.aviso, /actualizar-stock/);
      r = await ejecutar(productos.actualizarProducto, { ...datos, nombre: 'Otro nombre' }, { id: 'test-producto' });
      assert.equal(r.status, 200);
      assert.deepEqual(await leer(), { cantidad: 27, movimientos: [] });
      const [[p]] = await real.query("SELECT nombre,precio_venta,stock_minimo FROM productos WHERE id='test-producto'");
      assert.equal(p.nombre, 'Otro nombre'); assert.equal(Number(p.precio_venta), 150); assert.equal(p.stock_minimo, 2);
    });
  } finally {
    await real.rollback();
    await real.end();
  }
});
