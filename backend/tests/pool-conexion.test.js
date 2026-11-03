const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const mysql = require('mysql2/promise');

test('Código fuente: sin createConnection ni conexión única compartida', () => {
  const raiz = path.join(__dirname, '../src');
  const archivos = [];
  const recorrer = d => fs.readdirSync(d, { withFileTypes: true }).forEach(e => e.isDirectory() ? recorrer(path.join(d, e.name)) : e.name.endsWith('.js') && archivos.push(path.join(d, e.name)));
  recorrer(raiz);
  for (const f of archivos) assert.doesNotMatch(fs.readFileSync(f, 'utf8'), /createConnection/, path.relative(raiz, f));
  assert.match(fs.readFileSync(path.join(raiz, 'config/db.js'), 'utf8'), /createPool/);
  const index = fs.readFileSync(path.join(raiz, 'index.js'), 'utf8');
  assert.doesNotMatch(index, /uncaughtException/, 'No se ignoran errores fatales');
});

// Pool real contra MariaDB, en una base desechable creada y borrada aquí.
test('Pool: transacción en una conexión, liberación, rollback y ECONNRESET recuperable', { skip: process.env.RUN_MYSQL_POOL_TESTS !== '1' }, async t => {
  require('dotenv').config({ path: path.join(__dirname, '../.env'), quiet: true });
  const admin = await mysql.createConnection({ host: process.env.DB_HOST, port: process.env.DB_PORT, user: process.env.DB_USER, password: process.env.DB_PASSWORD });
  const nombre = 'dj_pool_test_' + randomUUID().replaceAll('-', '');
  await admin.query('CREATE DATABASE ' + nombre);
  await admin.query(`CREATE TABLE ${nombre}.cuentas (id INT PRIMARY KEY, saldo INT NOT NULL) ENGINE=InnoDB`);
  const anterior = process.env.DB_NAME, limite = process.env.DB_POOL_LIMIT;
  process.env.DB_NAME = nombre; process.env.DB_POOL_LIMIT = '3';
  const rutaDb = require.resolve('../src/config/db');
  delete require.cache[rutaDb];
  const db = require('../src/config/db');
  const id = async c => (await c.query('SELECT CONNECTION_ID() AS id'))[0][0].id;
  const saldo = async () => (await admin.query(`SELECT saldo FROM ${nombre}.cuentas WHERE id=1`))[0][0]?.saldo;

  try {
    await t.test('todas las consultas de una transacción usan la misma conexión', async () => {
      const a = await db.obtenerConexion(), b = await db.obtenerConexion();
      try {
        const ida = await id(a);
        await a.beginTransaction();
        await a.query('INSERT INTO cuentas VALUES (1, 100)');
        assert.equal(await id(a), ida);
        assert.notEqual(await id(b), ida);
        assert.equal((await b.query('SELECT COUNT(*) AS n FROM cuentas'))[0][0].n, 0, 'sin commit no es visible');
        await a.commit();
        assert.equal((await b.query('SELECT COUNT(*) AS n FROM cuentas'))[0][0].n, 1);
      } finally { await a.end(); await b.end(); }
    });

    await t.test('end() devuelve la conexión al pool, es idempotente y no agota el límite', async () => {
      for (let i = 0; i < 12; i++) {
        const c = await db.obtenerConexion();
        await c.query('SELECT 1');
        await c.end(); await c.end();
      }
      const tres = await Promise.all([db.obtenerConexion(), db.obtenerConexion(), db.obtenerConexion()]);
      await Promise.all(tres.map(c => c.end()));
    });

    await t.test('end() con transacción abierta revierte antes de devolverla', async () => {
      const c = await db.obtenerConexion();
      await c.beginTransaction();
      await c.query('UPDATE cuentas SET saldo=999 WHERE id=1');
      await c.end();
      assert.equal(await saldo(), 100);
      const d = await db.obtenerConexion();
      assert.equal((await d.query('SELECT @@in_transaction AS t').catch(() => [[{ t: 0 }]]))[0][0].t, 0);
      await d.end();
    });

    await t.test('conexión ociosa cortada (ECONNRESET): el proceso sigue y la siguiente consulta funciona', async () => {
      const c = await db.obtenerConexion();
      const muerta = await id(c);
      await c.end();
      await admin.query('KILL ' + muerta);
      await new Promise(r => setTimeout(r, 300));
      const nueva = await db.obtenerConexion();
      assert.notEqual(await id(nueva), muerta);
      await nueva.end();
      await new Promise((resolve, reject) => db.query('SELECT 1 AS ok', (e, r) => e ? reject(e) : resolve(r)));
    });

    await t.test('corte durante una transacción: la consulta falla, no se reutiliza y no cae el proceso', async () => {
      const c = await db.obtenerConexion();
      const muerta = await id(c);
      await c.beginTransaction();
      await c.query('UPDATE cuentas SET saldo=500 WHERE id=1');
      await admin.query('KILL ' + muerta);
      await new Promise(r => setTimeout(r, 300));
      await assert.rejects(() => c.query('UPDATE cuentas SET saldo=600 WHERE id=1'));
      await assert.doesNotReject(() => c.end());
      assert.equal(await saldo(), 100, 'la transacción cortada no confirma nada');
      const otra = await db.obtenerConexion();
      assert.notEqual(await id(otra), muerta);
      await otra.end();
    });

    await t.test('un fallo en la transacción hace rollback explícito y libera', async () => {
      const c = await db.obtenerConexion();
      try {
        await c.beginTransaction();
        await c.query('UPDATE cuentas SET saldo=saldo-10 WHERE id=1');
        await assert.rejects(() => c.query('INSERT INTO cuentas VALUES (1, 1)'), { code: 'ER_DUP_ENTRY' });
        await c.rollback();
      } finally { await c.end(); }
      assert.equal(await saldo(), 100);
    });
  } finally {

    await new Promise(r => db.end(() => r()));
    await admin.query('DROP DATABASE ' + nombre);
    await admin.end();
    if (anterior === undefined) delete process.env.DB_NAME; else process.env.DB_NAME = anterior;
    if (limite === undefined) delete process.env.DB_POOL_LIMIT; else process.env.DB_POOL_LIMIT = limite;
    delete require.cache[rutaDb];
  }
});
