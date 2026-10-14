const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const express = require('express'), jwt = require('jsonwebtoken');

function load(file, deps) {
  const module = { exports: {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../src', file), 'utf8'), {
    module, exports: module.exports, process, Buffer, console: { error() {} },
    require: name => Object.hasOwn(deps, name) ? deps[name] : require(name),
  });
  return module.exports;
}
test('GET /mermas/refrigeradores: JWT, roles, lectura minima y errores', async t => {
  const previousSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = 'secreto-exclusivo-prueba-refrigeradores-123456789';
  let role = 'Administrador', server, failure = false, empty = false, connections = 0, closes = 0, rollbacks = 0;
  const fixtures = [{ id: 'r1', nombre: 'Barra', estado: 'activa', deleted_at: null, ubicacion: 'privada' },
    { id: 'r2', nombre: 'Cocina', estado: 'mantenimiento', deleted_at: null },
    { id: 'r3', nombre: 'Bodega', estado: 'apagada', deleted_at: null },
    { id: 'r4', nombre: 'Eliminado', estado: 'activa', deleted_at: '2026-10-01' }];
  const connection = { query: async sql => {
    assert.doesNotMatch(sql, /^(INSERT|UPDATE|DELETE|ALTER|CREATE)/i);
    if (sql.startsWith('SELECT')) {
      assert.equal(sql, 'SELECT id,nombre,estado FROM refrigeradores WHERE deleted_at IS NULL ORDER BY nombre ASC,id ASC');
      if (failure) throw new Error('SQL no disponible');
      return [empty ? [] : fixtures.filter(r => r.deleted_at === null).map(({ id, nombre, estado }) => ({ id, nombre, estado }))];
    }
    return [[]];
  }, commit: async () => {}, rollback: async () => { rollbacks++; }, end: async () => { closes++; } };
  const controller = load('controllers/mermasController.js', {
    '../config/db': { dbConfig: {} },
    mysql2: { createConnection: () => { connections++; return { promise: () => connection }; } },
    '../services/identidadService': require('../src/services/identidadService'),
  });
  const router = load('routes/mermasRoutes.js', {
    '../controllers/mermasController': controller,
    '../middleware/rolesMiddleware': require('../src/middleware/rolesMiddleware'),
  });
  const auth = load('middleware/authMiddleware.js', {
    '../config/db': { promise: () => ({ query: async () => [[{ id: 'u1', nombre: 'Usuario', estado: 'activo', roles_id: 1, rol: role }]] }) },
  });
  const token = jwt.sign({}, process.env.JWT_SECRET, { subject: 'u1', issuer: 'dondejuanca', expiresIn: '1h', algorithm: 'HS256' });
  try {
    const app = express(); app.use('/api/mermas', auth, router);
    server = await new Promise(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
    const request = async bearer => {
      const r = await fetch(`http://127.0.0.1:${server.address().port}/api/mermas/refrigeradores`, { headers: bearer ? { Authorization: `Bearer ${bearer}` } : {} });
      return { status: r.status, data: await r.json() };
    };
    await t.test('sin JWT o alterado devuelve 401 antes de consultar catalogo', async () => {
      assert.equal((await request()).status, 401); assert.equal((await request('invalido')).status, 401); assert.equal(connections, 0);
    });
    for (const rol of ['Administrador','SuperAdmin']) await t.test(`${rol} recibe solo campos utiles y no eliminados`, async () => {
      role = rol; const r = await request(token); assert.equal(r.status, 200); assert.equal(r.data.total, 3);
      assert.deepEqual(r.data.datos.map(p => p.estado), ['activa','mantenimiento','apagada']);
      for (const row of r.data.datos) assert.deepEqual(Object.keys(row).sort(), ['id','nombre','estado'].sort());
    });
    for (const rol of ['Bartender','Mesero','Mesera','Cajero','Desconocido']) await t.test(`${rol} obtiene 403 sin abrir conexion de catalogo`, async () => {
      role = rol; const before = connections; assert.equal((await request(token)).status, 403); assert.equal(connections, before);
    });
    await t.test('lista vacia valida', async () => {
      role = 'Administrador'; empty = true; const r = await request(token); assert.equal(r.status, 200); assert.deepEqual(r.data.datos, []); assert.equal(r.data.total, 0); empty = false;
    });
    await t.test('error SQL devuelve 500, revierte y libera conexion', async () => {
      failure = true; const r = await request(token); assert.equal(r.status, 500); assert.equal(rollbacks, 1); assert.equal(connections, closes);
    });
  } finally {
    if (server) await new Promise(resolve => server.close(resolve));
    if (previousSecret === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = previousSecret;
  }
});
