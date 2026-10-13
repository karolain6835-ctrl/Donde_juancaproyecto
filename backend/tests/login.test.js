const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { once } = require('node:events');
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const mysql = require('mysql2/promise');
const { inicializar } = require('../scripts/inicializar-login-desarrollo');

test('login HTTP, bcrypt, JWT e inicialización contra MySQL temporal', {
  skip: process.env.RUN_MYSQL_LOGIN_TESTS !== '1'
}, async t => {
  require('dotenv').config({ path: path.join(__dirname, '../.env'), quiet: true });
  const anterior = { secreto: process.env.JWT_SECRET, vigencia: process.env.JWT_EXPIRES_IN_SECONDS };
  process.env.JWT_SECRET = require('node:crypto').randomBytes(32).toString('hex');
  process.env.JWT_EXPIRES_IN_SECONDS = '3600';
  const conexion = await mysql.createConnection({
    host: process.env.DB_HOST, port: process.env.DB_PORT, user: process.env.DB_USER,
    password: process.env.DB_PASSWORD, database: process.env.DB_NAME, connectTimeout: 5000
  });
  const password = 'DondeJuanca-Dev-2026!';
  let servidor;
  let fallarSQL = false;
  let cambioConcurrente = false;
  try {
    for (const tabla of ['usuarios', 'roles']) {
      await conexion.query(`CREATE TEMPORARY TABLE copia_login_${tabla} LIKE ${tabla}`);
      await conexion.query(`CREATE TEMPORARY TABLE ${tabla} LIKE copia_login_${tabla}`);
    }
    await conexion.query("INSERT INTO roles (id,nombre,activo) VALUES (1,'Administrador',1)");
    for (const [id, estado] of [['usr-001', 'activo'], ['usr-002', 'inactivo'], ['usr-003', 'bloqueado']]) {
      await conexion.query(`INSERT INTO usuarios (id,nombre,email,password_hash,estado,roles_id)
        VALUES (?, 'Usuario prueba', ?, 'marcador_prueba', ?, 1)`, [id, `${id}@example.invalid`, estado]);
    }
    const modulo = { exports: {} };
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../src/controllers/usuariosController.js'), 'utf8'), {
      module: modulo, exports: modulo.exports, process, Buffer,
      require: nombre => nombre === '../config/db' ? {
        promise: () => ({ query: async (sql, params) => {
          if (fallarSQL) throw Object.assign(new Error('Fallo SQL inyectado'), { code: 'TEST_SQL' });
          if (cambioConcurrente && sql.includes('UPDATE usuarios')) return [{ affectedRows: 0 }];
          return conexion.query(sql, params);
        } })
      } : require(nombre),
      console: { error() {} }
    });
    const rutas = { exports: {} };
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../src/routes/usuariosRoutes.js'), 'utf8'), {
      module: rutas,
      require: nombre => nombre === '../controllers/usuariosController' ? modulo.exports : nombre === '../middleware/rolesMiddleware' ? require('../src/middleware/rolesMiddleware') : nombre === '../middleware/authMiddleware' ? (()=>assert.fail('Login no debe requerir autenticacion')) : require(nombre)
    });
    const app = express();
    app.use(express.json());
    app.use('/api/usuarios', rutas.exports);
    servidor = app.listen(0, '127.0.0.1');
    await once(servidor, 'listening');
    const login = async (body = {}) => {
      const response = await fetch(`http://127.0.0.1:${servidor.address().port}/api/usuarios/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
      });
      return { status: response.status, body: await response.json() };
    };
    const credenciales = { correo: 'usr-001@example.invalid', contrasena: password };
    await t.test('marcadores rechazados; vista previa no escribe; aplicación bcrypt preserva estados', async () => {
      assert.equal((await login(credenciales)).status, 401);
      const ids = ['usr-001', 'usr-002', 'usr-003'];
      const preview = await inicializar({ conexion, ids });
      assert.equal(preview.aplicado, false);
      const [[antes]] = await conexion.query("SELECT password_hash FROM usuarios WHERE id='usr-001'");
      assert.equal(antes.password_hash, 'marcador_prueba');
      await assert.rejects(inicializar({ conexion, ids, aplicar: true, password, entorno: 'production' }));
      await inicializar({ conexion, ids, aplicar: true, password, entorno: 'test' });
      const [usuarios] = await conexion.query('SELECT password_hash,estado FROM usuarios ORDER BY id');
      assert.equal(new Set(usuarios.map(u => u.password_hash)).size, 3);
      for (const usuario of usuarios) assert.equal(await bcrypt.compare(password, usuario.password_hash), true);
      assert.deepEqual(usuarios.map(u => u.estado), ['activo', 'inactivo', 'bloqueado']);
      const repetido = await inicializar({ conexion, ids, aplicar: true, password: 'OtraClave-Dev-2026!', entorno: 'test' });
      assert.ok(repetido.usuarios.every(u => u.accion === 'conservar_hash_valido'));
    });
    await t.test('login real, JWT firmado, identidad real y último acceso', async () => {
      const r = await login(credenciales);
      assert.equal(r.status, 200);
      assert.deepEqual(r.body.usuario, {
        id: 'usr-001', nombre: 'Usuario prueba', correo: credenciales.correo, roles_id: 1, rol: 'Administrador'
      });
      assert.equal(r.body.token_type, 'Bearer');
      assert.equal(r.body.expires_in, 3600);
      assert.equal(JSON.stringify(r.body).includes('password_hash'), false);
      const payload = jwt.verify(r.body.token, process.env.JWT_SECRET, { algorithms: ['HS256'], issuer: 'dondejuanca' });
      assert.equal(payload.sub, 'usr-001');
      assert.equal(payload.roles_id, 1);
      assert.equal(payload.exp - payload.iat, 3600);
      assert.equal(payload.password_hash, undefined);
      assert.throws(() => jwt.verify(r.body.token, 'secreto-incorrecto', { algorithms: ['HS256'] }));
      const [[usuario]] = await conexion.query("SELECT ultimo_acceso FROM usuarios WHERE id='usr-001'");
      assert.ok(usuario.ultimo_acceso);
    });
    await t.test('contraseña incorrecta, usuario ausente, estados y Body inválido', async () => {
      assert.equal((await login({ ...credenciales, contrasena: 'incorrecta' })).status, 401);
      assert.equal((await login({ ...credenciales, correo: 'no-existe@example.invalid' })).status, 401);
      for (const id of ['usr-002', 'usr-003']) {
        assert.equal((await login({ correo: `${id}@example.invalid`, contrasena: password })).status, 403);
        const [[u]] = await conexion.query('SELECT ultimo_acceso FROM usuarios WHERE id=?', [id]);
        assert.equal(u.ultimo_acceso, null);
      }
      for (const body of [{}, { correo: [], contrasena: password }, { ...credenciales, contrasena: 'a'.repeat(73) }]) {
        assert.equal((await login(body)).status, 400);
      }
    });
    await t.test('sin JWT válido o error SQL no autentica; cambio concurrente no devuelve token', async () => {
      const secreto = process.env.JWT_SECRET;
      delete process.env.JWT_SECRET;
      assert.equal((await login(credenciales)).status, 500);
      process.env.JWT_SECRET = secreto;
      fallarSQL = true;
      assert.equal((await login(credenciales)).status, 500);
      fallarSQL = false;
      cambioConcurrente = true;
      const r = await login(credenciales);
      assert.equal(r.status, 401);
      assert.equal(r.body.token, undefined);
      cambioConcurrente = false;
    });
    await t.test('inicialización revierte todo si falla una actualización', async () => {
      await conexion.query("UPDATE usuarios SET password_hash='prueba_rollback'");
      let actualizaciones = 0;
      const conFallo = {
        beginTransaction: () => conexion.beginTransaction(), commit: () => conexion.commit(), rollback: () => conexion.rollback(),
        query: async (sql, params) => {
          if (sql.includes('SET password_hash') && ++actualizaciones === 2) throw new Error('Fallo inyectado');
          return conexion.query(sql, params);
        }
      };
      await assert.rejects(inicializar({ conexion: conFallo, ids: ['usr-001', 'usr-002'], aplicar: true, password, entorno: 'test' }));
      const [usuarios] = await conexion.query('SELECT password_hash FROM usuarios');
      assert.ok(usuarios.every(u => u.password_hash === 'prueba_rollback'));
    });
  } finally {
    if (servidor) {
      servidor.closeAllConnections();
      await new Promise(resolve => servidor.close(resolve));
    }
    await conexion.end();
    if (anterior.secreto === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = anterior.secreto;
    if (anterior.vigencia === undefined) delete process.env.JWT_EXPIRES_IN_SECONDS; else process.env.JWT_EXPIRES_IN_SECONDS = anterior.vigencia;
  }
});
