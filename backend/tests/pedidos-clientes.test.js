const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function cargar(db, real) {
  const connection = { query: (sql, params) => new Promise((resolve, reject) => db.query(sql, params, (error, rows) => error ? reject(error) : resolve([rows]))), beginTransaction: () => real ? real.beginTransaction() : Promise.resolve(), commit: () => real ? real.commit() : Promise.resolve(), rollback: () => real ? real.rollback() : Promise.resolve(), end: async () => {} };
  const module = { exports: {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../src/controllers/pedidosController.js'), 'utf8'), {
    module, console: { error() {} }, require: name => name === 'mysql2' ? { createConnection: () => ({ promise: () => connection }) } : name === '../config/db' ? db :
      name === '../services/identidadService' ? require('../src/services/identidadService') : require(name)
  });
  return module.exports.crearPedido;
}
const body = { mesas_id: 'mesa', usuarios_id: 'asignado', clientes_id: 'cliente' };
function invocar(fn, datos = body) {
  return new Promise(resolve => fn({ body: datos, usuario: { id: 'ejecutor' } }, {
    code: 200, status(code) { this.code = code; return this; },
    json(data) { resolve({ status: this.code, data }); }
  }));
}

test('Pedidos: validacion previa y errores sin insertar', async t => {
  for (const [nombre, filas, error, esperado] of [
    ['inexistente', [], null, 404], ['inactivo', [{ estado: 'inactivo' }], null, 409],
    ['error de consulta', [], new Error('consulta fallida'), 500]
  ]) await t.test(nombre, async () => {
    let consultas = 0;
    const r = await invocar(cargar({ query(sql, params, cb) {
      if (sql.includes('FROM mesas')) return cb(null, [{ id: 'mesa', estado: 'disponible' }]);
      consultas++;
      assert.equal(sql, 'SELECT estado FROM clientes WHERE id = ? LOCK IN SHARE MODE');
      assert.equal(params[0], 'cliente');
      cb(error, filas);
    } }));
    assert.equal(r.status, esperado);
    assert.equal(consultas, 1, 'No debe intentar INSERT');
    if (esperado === 409) assert.match(r.data.error, /no puede asociarse.*cliente inactivo/i);
  });
  await t.test('campos obligatorios mantienen 400 sin consultar', async () => {
    for (const campo of Object.keys(body)) {
      const datos = { ...body }; delete datos[campo];
      assert.equal((await invocar(cargar({ query() { assert.fail('No consultar'); } }), datos)).status, 400);
    }
  });
  await t.test('fallo del INSERT mantiene 500', async () => {
    let consultas = 0;
    assert.equal((await invocar(cargar({ query(sql, params, cb) {
      if (sql.includes('FROM mesas')) return cb(null, [{ id: 'mesa', estado: 'disponible' }]);
      if (++consultas <= 2) cb(null, [{ estado: 'activo' }]);
      else cb(new Error('insert fallido'));
    } }))).status, 500);
    assert.equal(consultas, 3);
  });
});

test('Pedidos: persistencia MySQL temporal y responsable asignado', {
  skip: process.env.RUN_MYSQL_PEDIDOS_TESTS !== '1'
}, async t => {
  require('dotenv').config({ path: path.join(__dirname, '../.env'), quiet: true });
  const c = await require('mysql2/promise').createConnection({
    host: process.env.DB_HOST, port: process.env.DB_PORT, user: process.env.DB_USER,
    password: process.env.DB_PASSWORD, database: process.env.DB_NAME
  });
  try {
    for (const tabla of ['usuarios', 'mesas', 'clientes', 'pedidos']) {
      await c.query(`CREATE TEMPORARY TABLE copia_pedidos_${tabla} LIKE ${tabla}`);
      await c.query(`CREATE TEMPORARY TABLE ${tabla} LIKE copia_pedidos_${tabla}`);
    }
    await c.query("INSERT INTO mesas (id,numero,estado) VALUES ('mesa',1,'disponible')");
    for (const id of ['ejecutor', 'asignado']) await c.query(
      "INSERT INTO usuarios (id,nombre,email,password_hash,estado,roles_id) VALUES (?,?,?,'fixture','activo',1)",
      [id, id, id + '@example.invalid']);
    await c.query("INSERT INTO clientes (id,nombre,estado,usuarios_id) VALUES ('cliente','Cliente','activo','ejecutor'),('inactivo','Inactivo','inactivo','ejecutor')");
    const crear = cargar({ query: (sql, params, cb) => c.query(sql, params).then(([r]) => cb(null, r), cb) }, c);
    await t.test('activo crea y conserva contrato y responsable', async () => {
      const r = await invocar(crear);
      assert.equal(r.status, 201);
      assert.deepEqual(Object.keys(r.data).sort(), ['id_pedido', 'mensaje']);
      const [[p]] = await c.query('SELECT * FROM pedidos WHERE id=?', [r.data.id_pedido]);
      assert.equal(p.clientes_id, 'cliente'); assert.equal(p.usuarios_id, 'asignado');
      assert.equal(p.mesas_id, 'mesa'); assert.equal(p.estado, 'abierto'); assert.equal(p.sincronizado, 0);
    });
    for (const [id, status] of [['no-existe', 404], ['inactivo', 409]]) await t.test(id + ' no persiste', async () => {
      const [[antes]] = await c.query('SELECT COUNT(*) AS total FROM pedidos');
      assert.equal((await invocar(crear, { ...body, clientes_id: id })).status, status);
      const [[despues]] = await c.query('SELECT COUNT(*) AS total FROM pedidos');
      assert.equal(despues.total, antes.total);
    });
  } finally { await c.end(); }
});
