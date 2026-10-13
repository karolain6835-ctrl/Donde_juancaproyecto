const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const identidad = require('../src/services/identidadService');

const operaciones = [
  ['inventario', 'actualizarStock', 'usuarios_id'],
  ['mermas', 'registrarMerma', 'usuarios_id'],
  ['compras', 'crearCompra', 'usuarios_id'],
  ['compras', 'recibirCompra', 'usuarios_id'],
  ['pagos', 'registrarPago', 'usuarios_id'],
  ['clientes', 'registrarCliente', 'usuarios_id'],
  ['pedidos', 'agregarItemPedido', 'usuarios_id'],
  ['pedidos', 'cancelarItemPedido', 'usuarios_id'],
  ['kanban', 'actualizarEstadoPedido', 'usuarios_id'],
  ['divisiones', 'iniciarSesionDivision', 'usuarios_id'],
  ['ventas', 'generarFactura', 'usuarios_id'],
  ['cierresCaja', 'crear', 'usuarios_id'],
  ['juegos', 'iniciarJuego', 'iniciada_por'],
  ['juegos', 'terminarJuego', 'cerrada_por']
];
const cargar = (nombre, db) => {
  const modulo = { exports: {} };
  const prohibido = new Proxy({}, { get: () => () => assert.fail('No debe iniciar operaciones de negocio') });
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../src/controllers', nombre + 'Controller.js'), 'utf8'), {
    module: modulo, exports: modulo.exports, console,
    require: n => n === '../services/identidadService' ? identidad
      : n === '../config/db' ? (db || prohibido)
      : n.startsWith('../services/') || n === 'mysql2' ? prohibido : (n === '../services/auditoriaService' ? require('../src/services/auditoriaService') : require(n))
  });
  return modulo.exports;
};
const invocar = (fn, req) => new Promise((resolve, reject) => {
  Promise.resolve(fn(req, {
    code: 200,
    status(code) { this.code = code; return this; },
    json(data) { resolve({ status: this.code, data }); }
  })).catch(reject);
});

test('Fase 3A: rechazar atribución por body antes de cualquier escritura', async t => {
  for (const [modulo, funcion, campo] of operaciones) {
    const fn = cargar(modulo)[funcion];
    await t.test(modulo + '.' + funcion, async () => {
      for (const valor of ['otro-usuario', 'actor-real', null]) {
        const r = await invocar(fn, { params: {}, usuario: { id: 'actor-real' }, body: { [campo]: valor } });
        assert.equal(r.status, 400);
      }
      const r = await invocar(fn, { params: {}, body: {} });
      assert.equal(r.status, 401);
    });
  }
});

test('Divisiones y responsable de pedido: MySQL real temporal', {
  skip: process.env.RUN_MYSQL_IDENTIDAD_TESTS !== '1'
}, async () => {
  require('dotenv').config({ path: path.join(__dirname, '../.env'), quiet: true });
  const c = await require('mysql2/promise').createConnection({
    host: process.env.DB_HOST, port: process.env.DB_PORT, user: process.env.DB_USER,
    password: process.env.DB_PASSWORD, database: process.env.DB_NAME
  });
  try {
    for (const tabla of ['auditoria', 'mesas', 'usuarios', 'clientes', 'pedidos', 'sesiones_division_cuentas']) {
      await c.query(`CREATE TEMPORARY TABLE copia_identidad_${tabla} LIKE ${tabla}`);
      await c.query(`CREATE TEMPORARY TABLE ${tabla} LIKE copia_identidad_${tabla}`);
    }
    for (const id of ['ejecutor', 'asignado']) await c.query(
      "INSERT INTO usuarios (id,nombre,email,password_hash,estado,roles_id) VALUES (?,?,?,'fixture','activo',1)",
      [id, id, id + '@example.invalid']);
    await c.query("INSERT INTO mesas (id,numero,estado) VALUES ('mesa',1,'disponible')");
    await c.query("INSERT INTO clientes (id,nombre,estado,usuarios_id) VALUES ('cliente','Cliente','activo','ejecutor')");
    const db = { query: (sql, params, cb) => c.query(sql, params).then(([r]) => cb(null, r), cb) };
    const pedido = await invocar(cargar('pedidos', db).crearPedido, {
      usuario: { id: 'ejecutor' }, body: { mesas_id: 'mesa', clientes_id: 'cliente', usuarios_id: 'asignado' }
    });
    assert.equal(pedido.status, 201);
    const [[p]] = await c.query('SELECT usuarios_id FROM pedidos WHERE id=?', [pedido.data.id_pedido]);
    assert.equal(p.usuarios_id, 'asignado');
    const division = await invocar(cargar('divisiones', db).iniciarSesionDivision, {
      usuario: { id: 'ejecutor' }, body: { mesas_id: 'mesa', modalidad: 'total' }
    });
    assert.equal(division.status, 201);
    const [[d]] = await c.query('SELECT usuarios_id FROM sesiones_division_cuentas WHERE id=?', [division.data.data.id]);
    assert.equal(d.usuarios_id, 'ejecutor');
  } finally { await c.end(); }
});
