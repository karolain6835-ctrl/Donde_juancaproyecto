const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { crear, ejecutarSQL } = require('./helpers/comprasSandbox');

function load(file, deps) {
  const module = { exports: {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../src', file), 'utf8'), {
    module, exports: module.exports, console: { error() {} },
    require: name => Object.hasOwn(deps, name) ? deps[name] : require(name),
  });
  return module.exports;
}
const body = { nombre: 'Producto nuevo', codigo: 'NUEVO', precio_venta: 2844.44, cantidad: 5, stock_minimo: 2, categorias_id: 1, proveedores_id: 'prov' };

test('Alta de producto valida entradas y rechaza campos internos antes de SQL', () => {
  const controller = load('controllers/productosController.js', { '../config/db': { query() { assert.fail('No debe escribir'); } } });
  for (const value of [undefined, [], null, { ...body, nombre: '' }, { ...body, nombre: ' ' }, { ...body, codigo: '' },
    ...[0, -1, NaN, Infinity, 'mal', null].map(precio_venta => ({ ...body, precio_venta })),
    ...['costo_promedio', 'costo_promedio_ponderado', 'historial_costos_id', 'estado', 'extra'].map(key => ({ ...body, [key]: 1 })),
    { ...body, cantidad: -1 }, { ...body, stock_minimo: 0.5 }]) {
    let status;
    controller.crearProducto({ body: value }, { status(code) { status = code; return this; }, json() {} });
    assert.equal(status, 400);
  }
});

test('Productos: HTTP, FK y migracion v2.36 en MariaDB desechable', {
  skip: process.env.RUN_MYSQL_PRODUCTOS_TESTS !== '1',
}, async t => {
  const sandbox = await crear({ alertas: true });
  const c = sandbox.connection;
  let server, role = 'Administrador', nuevo;
  try {
    // LIKE no copia FKs: instalarlas explícitamente para comprobar integridad real.
    await c.query('ALTER TABLE productos MODIFY COLUMN historial_costos_id VARCHAR(36) NOT NULL');
    await c.query('ALTER TABLE productos ADD CONSTRAINT fk_test_producto_categoria FOREIGN KEY (categorias_id) REFERENCES categorias(id), ADD CONSTRAINT fk_test_producto_proveedor FOREIGN KEY (proveedores_id) REFERENCES proveedores(id), ADD CONSTRAINT fk_test_producto_historial FOREIGN KEY (historial_costos_id) REFERENCES historial_costos(id)');
    await c.query("INSERT INTO categorias(id,nombre,descripcion,activo) VALUES (1,'Real','Categoria real',1)");
    await c.query("INSERT INTO proveedores(id,contacto_nombre,estado) VALUES ('prov','Proveedor','activo')");
    await c.query("INSERT INTO usuarios(id,nombre,email,password_hash,estado,roles_id) VALUES ('u1','Actor','productos@example.invalid','fixture','activo',1)");
    await c.query("INSERT INTO compras(id,estado,total_estimado,total_recibido,creado_en,proveedores_id,usuarios_id) VALUES ('compra-legada','recibida',10,10,UTC_TIMESTAMP(),'prov','u1')");
    await c.query("INSERT INTO historial_costos(id,costo_unitario,costo_promedio_ponderado,creado_en,compras_id) VALUES ('hist-legado',12.34,12.34,UTC_TIMESTAMP(),'compra-legada')");
    await c.query("INSERT INTO productos(id,nombre,codigo,precio_venta,costo_promedio_ponderado,cantidad_disponible,stock_minimo,estado,categorias_id,proveedores_id,historial_costos_id) VALUES ('legado','Existente','LEGADO',20,12.34,10,1,'activo',1,'prov','hist-legado')");
    await ejecutarSQL(c, 'v2.36_productos_historial_costos_opcional.sql');
    await t.test('migracion permite NULL y conserva FK, CPP y relacion previa', async () => {
      const [[column]] = await c.query("SHOW COLUMNS FROM productos WHERE Field='historial_costos_id'");
      assert.equal(column.Null, 'YES');
      const [[p]] = await c.query("SELECT historial_costos_id,costo_promedio_ponderado AS cpp FROM productos WHERE id='legado'");
      assert.equal(p.historial_costos_id, 'hist-legado'); assert.equal(p.cpp, '12.34');
      await assert.rejects(c.query("UPDATE productos SET historial_costos_id='inexistente' WHERE id='legado'"), e => e.code === 'ER_NO_REFERENCED_ROW_2');
    });
    const db = { query(sql, params, cb) {
      if (typeof params === 'function') { cb = params; params = []; }
      c.query(sql, params).then(([rows]) => cb(null, rows), cb);
    } };
    const controller = load('controllers/productosController.js', { '../config/db': db });
    const router = load('routes/productosRoutes.js', {
      '../controllers/productosController': controller,
      '../middleware/rolesMiddleware': require('../src/middleware/rolesMiddleware'),
    });
    const express = require('express'), app = express();
    app.use(express.json());
    app.use((req, res, next) => { if (role) req.usuario = { id: 'u1', rol: role }; next(); });
    app.use('/api/productos', router);
    server = await new Promise(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
    const request = async (method, ruta = '', datos) => {
      const r = await fetch(`http://127.0.0.1:${server.address().port}/api/productos${ruta}`, {
        method, headers: { 'Content-Type': 'application/json' }, body: datos === undefined ? undefined : JSON.stringify(datos),
      });
      return { status: r.status, data: await r.json() };
    };
    await t.test('crear sin historial 201, CPP cero y sin historial ficticio', async () => {
      const r = await request('POST', '', body); assert.equal(r.status, 201, JSON.stringify(r.data)); nuevo = r.data.id_producto;
      const [[p]] = await c.query('SELECT * FROM productos WHERE id=?', [nuevo]);
      assert.equal(p.historial_costos_id, null); assert.equal(p.costo_promedio_ponderado, '0.00');
      assert.equal(p.cantidad_disponible, 5); assert.equal(p.precio_venta, '2844.44');
      const [[h]] = await c.query('SELECT COUNT(*) AS total FROM historial_costos'); assert.equal(h.total, 1);
    });
    await t.test('categoria y proveedor inexistentes 404 sin persistencia', async () => {
      for (const change of [{ categorias_id: 99999 }, { proveedores_id: 'inexistente' }]) {
        const r = await request('POST', '', { ...body, codigo: 'INVALIDO', ...change }); assert.equal(r.status, 404);
        const [[count]] = await c.query("SELECT COUNT(*) AS total FROM productos WHERE codigo='INVALIDO'"); assert.equal(count.total, 0);
      }
    });
    await t.test('precio y campos obligatorios 400', async () => {
      for (const change of [{ precio_venta: 0 }, { precio_venta: -1 }, { nombre: '' }, { codigo: '' }]) assert.equal((await request('POST', '', { ...body, ...change })).status, 400);
    });
    await t.test('CPP e historial no se pueden atribuir en POST', async () => {
      for (const key of ['costo_promedio', 'costo_promedio_ponderado', 'historial_costos_id']) assert.equal((await request('POST', '', { ...body, [key]: 99 })).status, 400);
    });
    await t.test('PUT conserva CPP, stock e historial en productos nuevos y existentes', async () => {
      for (const [id, cpp, historial] of [[nuevo, '0.00', null], ['legado', '12.34', 'hist-legado']]) {
        const r = await request('PUT', '/' + id, { ...body, codigo: id === nuevo ? 'NUEVO' : 'LEGADO', estado: 'activo', costo_promedio: 999, costo_promedio_ponderado: 999, cantidad: 999, historial_costos_id: 'inexistente' });
        assert.equal(r.status, 200); assert.match(r.data.aviso_costo, /CPP/);
        const [[p]] = await c.query('SELECT * FROM productos WHERE id=?', [id]);
        assert.equal(p.costo_promedio_ponderado, cpp); assert.equal(p.historial_costos_id, historial);
        assert.equal(p.cantidad_disponible, id === nuevo ? 5 : 10);
      }
    });
    await t.test('listado y detalle consultan productos nuevos y existentes', async () => {
      const r = await request('GET'); assert.equal(r.status, 200); assert.equal(r.data.datos.length, 2);
      for (const id of [nuevo, 'legado']) assert.equal((await request('GET', '/' + id)).data.datos.id, id);
    });
    await t.test('roles y autenticacion existentes intactos', async () => {
      for (const rol of ['Mesero', 'Mesera', 'Bartender', 'Cajero']) {
        role = rol; assert.equal((await request('GET')).status, 200);
        assert.equal((await request('POST', '', { ...body, codigo: rol })).status, 403);
      }
      role = null; assert.equal((await request('POST', '', body)).status, 401);
      role = 'SuperAdmin'; assert.equal((await request('POST', '', { ...body, codigo: 'SUPER', cantidad: 0 })).status, 201);
      // El trigger de alertas sigue funcionando con historial legado nulo.
      const [[a]] = await c.query("SELECT COUNT(*) AS total FROM alertas_inventario WHERE modelo_episodio='v2'"); assert.equal(a.total, 1);
    });
  } finally {
    if (server) await new Promise(resolve => server.close(resolve));
    await sandbox.close();
  }
});
