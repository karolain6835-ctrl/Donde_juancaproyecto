const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function fixture({ duplicada = false, duplicateWrite = false } = {}) {
  const calls = [];
  const connection = {
    async beginTransaction() {}, async commit() {}, async rollback() { calls.push('rollback'); }, async end() {},
    async query(sql, args) {
      calls.push({ sql, args });
      if (sql.includes('GET_LOCK')) return [[{ adquirido: 1 }]];
      if (sql.includes('WHERE id=? FOR UPDATE')) return [[{ id: 'mesa-actual', numero: 2, estado: 'ocupada' }]];
      if (sql.includes('WHERE numero=?')) return [duplicada ? [{ id: 'otra-mesa' }] : []];
      if (/^(INSERT|UPDATE)/.test(sql) && duplicateWrite) throw Object.assign(new Error("Duplicate entry SQL uq_mesas_numero"), { code: 'ER_DUP_ENTRY' });
      if (sql.startsWith('SELECT id,numero,estado')) return [[{ id: 'mesa-actual', numero: 7, estado: 'ocupada' }]];
      return [[]];
    },
  };
  const module = { exports: {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../src/controllers/mesasAdministracionController.js'), 'utf8'), {
    module, exports: module.exports, console, require(name) {
      if (name === 'mysql2') return { createConnection: () => ({ promise: () => connection }) };
      if (name === '../config/db') return { dbConfig: {} };
      if (name === '../services/identidadService') return { ejecutor: () => 'actor' };
      if (name === '../services/auditoriaService') return { registrarAuditoria: async () => {} };
      return require(name);
    },
  });
  return { calls, async invoke(editar, numero) {
    const res = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
    await module.exports[editar ? 'editarNumero' : 'crear']({ body: { numero }, params: { id: 'mesa-actual' } }, res);
    return res;
  } };
}

for (const editar of [false, true]) {
  for (const source of ['consulta', 'restriccion']) test(`${editar ? 'Editar' : 'Crear'}: duplicado por ${source} devuelve 409 amigable`, async () => {
    const f = fixture({ duplicada: source === 'consulta', duplicateWrite: source === 'restriccion' });
    const res = await f.invoke(editar, 7);
    assert.equal(res.statusCode, 409);
    assert.equal(res.body.error, 'Ya existe una mesa con el número 7.');
    assert.ok(f.calls.includes('rollback'));
    if (source === 'consulta') assert.ok(!f.calls.some(c => c.sql && /^(INSERT|UPDATE)/.test(c.sql)));
  });
  test(`${editar ? 'Editar' : 'Crear'}: rechaza números inválidos antes de consultar la BD`, async () => {
    for (const numero of [undefined, null, '', 'texto', '7', 0, -1, 1.5, 2147483648]) {
      const f = fixture();
      assert.equal((await f.invoke(editar, numero)).statusCode, 400);
      assert.equal(f.calls.length, 0);
    }
  });
  test(`${editar ? 'Editar' : 'Crear'}: número libre guarda; edición excluye su propio ID`, async () => {
    const f = fixture();
    const res = await f.invoke(editar, 7);
    assert.equal(res.statusCode, editar ? 200 : 201);
    const lookup = f.calls.find(c => c.sql?.includes('WHERE numero=?'));
    assert.equal(lookup.args[0], 7);
    if (editar) assert.equal(lookup.args[1], 'mesa-actual');
  });
}
