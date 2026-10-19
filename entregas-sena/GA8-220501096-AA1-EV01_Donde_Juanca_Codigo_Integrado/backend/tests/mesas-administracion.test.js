const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const { crear } = require('./helpers/comprasSandbox');
test('Administración de mesas real: altas, duplicados concurrentes y renumeración segura', { skip: process.env.RUN_MYSQL_MESAS_ADMIN_TESTS !== '1' }, async t => {
  const sandbox = await crear(), c = sandbox.connection;
  let failAudit = false;
  const module = { exports: {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../src/controllers/mesasAdministracionController.js'), 'utf8'), { module, exports: module.exports, console: { error() {} }, require: n => {
    if (n === '../config/db') return { dbConfig: sandbox.config };
    if (n === 'mysql2') return { createConnection(config) {
      const real = require('mysql2').createConnection(config).promise();
      return { promise: () => ({ beginTransaction: () => real.beginTransaction(), commit: () => real.commit(), rollback: () => real.rollback(), end: () => real.end(), query(sql, args) {
        if (failAudit && sql.includes('INSERT INTO auditoria')) throw new Error('Fallo auditoría');
        return real.query(sql, args);
      } }) };
    } };
    return require(n.startsWith('.') ? path.join(__dirname, '../src/controllers', n) : n);
  } });
  const controller = module.exports;
  const invoke = (fn, body, id, rol = 'Administrador') => new Promise((resolve, reject) => Promise.resolve(fn({ body, params: { id }, usuario: { id: 'actor', rol } }, { status(s) { this.s = s; return this; }, json(data) { resolve({ status: this.s || 200, data }); } })).catch(reject));
  try {
    await c.query("INSERT INTO usuarios(id,nombre,email,password_hash,estado,roles_id) VALUES ('actor','Actor','actor@example.invalid','fixture','activo',1)");
    await c.query("INSERT INTO mesas(id,numero,estado,creado_en) VALUES ('dup1',0,'ocupada',NOW()),('dup2',0,'disponible',NOW())");
    for (const [rol, numero] of [['Administrador', 1], ['SuperAdmin', 2]]) await t.test(`${rol} crea disponible sin QR obligatorio`, async () => {
      const r = await invoke(controller.crear, { numero }, null, rol); assert.equal(r.status, 201); assert.equal(r.data.datos.estado, 'disponible'); assert.equal(r.data.datos.numero, numero);
    });
    await t.test('número duplicado responde 409; entradas y estado manual rechazados', async () => {
      assert.equal((await invoke(controller.crear, { numero: 1 })).status, 409);
      for (const body of [{}, { numero: 0 }, { numero: -1 }, { numero: 1.5 }, { numero: '3' }, { numero: 3, estado: 'ocupada' }, { numero: 2147483648 }]) assert.equal((await invoke(controller.crear, body)).status, 400);
    });
    await t.test('dos conexiones para un número nuevo crean solo una mesa', async () => {
      const results = await Promise.all([invoke(controller.crear, { numero: 3 }), invoke(controller.crear, { numero: 3 })]);
      assert.deepEqual(results.map(r => r.status).sort(), [201, 409]);
      assert.equal((await c.query('SELECT COUNT(*) AS n FROM mesas WHERE numero=3'))[0][0].n, 1);
    });
    await t.test('renumerar conserva ID, estado, pedido y duplicados existentes', async () => {
      await c.query("INSERT INTO pedidos(id,estado,creado_en,mesas_id,usuarios_id,clientes_id) VALUES ('p','abierto',NOW(),'dup1','actor',NULL)");
      assert.equal((await invoke(controller.editarNumero, { numero: 4 }, 'dup1')).status, 200);
      assert.equal((await c.query("SELECT estado FROM mesas WHERE id='dup1'"))[0][0].estado, 'ocupada');
      assert.equal((await c.query("SELECT mesas_id FROM pedidos WHERE id='p'"))[0][0].mesas_id, 'dup1');
      assert.equal((await c.query("SELECT numero FROM mesas WHERE id='dup2'"))[0][0].numero, 0);
      assert.equal((await invoke(controller.editarNumero, { numero: 1 }, 'dup1')).status, 409);
      assert.equal((await invoke(controller.editarNumero, { numero: 4 }, 'missing')).status, 404);
    });
    await t.test('fallo de auditoría revierte alta y libera bloqueo para reintento', async () => {
      failAudit = true; assert.equal((await invoke(controller.crear, { numero: 5 })).status, 500); failAudit = false;
      assert.equal((await c.query('SELECT COUNT(*) AS n FROM mesas WHERE numero=5'))[0][0].n, 0);
      assert.equal((await invoke(controller.crear, { numero: 5 })).status, 201);
    });
  } finally { await sandbox.close(); }
});
