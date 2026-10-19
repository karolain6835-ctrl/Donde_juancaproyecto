const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

// Ejecuta los servicios TypeScript con transporte/almacenamiento aislados.
// No se abre conexión de red ni se utilizan credenciales reales.
function harness(fetch, secure = {}, dev = true) {
  const cache = {};
  const processStub = { env: { EXPO_PUBLIC_API_URL: 'https://api.example.invalid' } };
  function load(name) {
    if (cache[name]) return cache[name];
    const filename = path.join(__dirname, '../src/services', `${name}.ts`);
    const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    const mod = { exports: {} };
    vm.runInNewContext(code, { exports: mod.exports, module: mod,
      require: dep => dep === 'expo-secure-store' ? secure : load(dep.replace('./', '')),
      process: processStub, __DEV__: dev, URL, AbortController, setTimeout, clearTimeout, fetch,
    }, { filename });
    cache[name] = mod.exports;
    return mod.exports;
  }
  return { load, env: processStub.env };
}
const user = { id: 'identity-example', nombre: 'Nombre de contrato', correo: 'example@example.invalid', rol: 'Mesera', estado: 'activo' };
const token = 'header.payload.signature'; // Solo fixture sintético; nunca usado contra una API.
const response = (data, status = 200) => ({ ok: status === 200, status, json: async () => data });

test('login exige token válido y recupera identidad vigente con Bearer', async () => {
  const calls = [];
  const h = harness(async (url, options) => {
    calls.push({ url, options });
    return response(calls.length === 1 ? { token, token_type: 'Bearer', expires_in: 3600, usuario: { id: user.id } } : { usuario: user });
  });
  const result = await h.load('auth').authenticate(' example@example.invalid ', 'synthetic-fixture', h.load('api').apiBaseUrl());
  assert.equal(result.user.nombre, user.nombre);
  assert.equal(calls[0].url, 'https://api.example.invalid/api/usuarios/login');
  assert.deepEqual(JSON.parse(calls[0].options.body), { correo: user.correo, contrasena: 'synthetic-fixture' });
  assert.equal(calls[1].url, 'https://api.example.invalid/api/usuarios/me');
  assert.equal(calls[1].options.headers.Authorization, `Bearer ${token}`);
});
test('otros roles e identidad inactiva no permiten acceder', async () => {
  for (const changes of [{ rol: 'Administrador' }, { rol: 'Mesero' }, { estado: 'inactivo' }]) {
    const h = harness(async () => response({ usuario: { ...user, ...changes } }));
    await assert.rejects(h.load('auth').currentUser(token));
  }
});
test('rechaza login incompleto, vigencia inválida e identidad diferente', async () => {
  for (const data of [{}, { token, token_type: 'Bearer', expires_in: -1, usuario: { id: user.id } },
    { token, token_type: 'Bearer', expires_in: 3600, usuario: { id: 'other' } }]) {
    let calls = 0;
    const h = harness(async () => response(++calls === 1 ? data : { usuario: user }));
    await assert.rejects(h.load('auth').authenticate(user.correo, 'fixture', 'https://api.example.invalid'));
  }
});
test('errores HTTP, red y JSON inválido se comunican sin filtrar cuerpos', async () => {
  for (const status of [400, 401, 403, 429, 500]) {
    const h = harness(async () => response({ error: 'sensitive-detail' }, status));
    await assert.rejects(h.load('api').apiRequest('/api/usuarios/me', { token }), e => e.status === status && !e.message.includes('sensitive-detail'));
  }
  await assert.rejects(harness(async () => { throw new Error('secret'); }).load('api').apiRequest('/api/usuarios/me'), /No pudimos conectar/);
  await assert.rejects(harness(async () => ({ ok: true, json: async () => { throw new Error(); } })).load('api').apiRequest('/api/usuarios/me'), /respuesta no válida/);
});
test('URL LAN de desarrollo permite login sin aviso de configuración ni /api duplicado', async () => {
  let request;
  const h = harness(async (url, options) => {
    request = { url, options };
    return response({});
  });
  h.env.EXPO_PUBLIC_API_URL = 'http://192.168.2.232:5000';
  assert.equal(h.load('api').apiBaseUrl(), h.env.EXPO_PUBLIC_API_URL);
  await h.load('api').apiRequest('/api/usuarios/login', { body: { correo: user.correo, contrasena: 'fixture' } });
  assert.equal(request.url, 'http://192.168.2.232:5000/api/usuarios/login');
  assert.equal(request.options.method, 'POST');
});

test('URL central rechaza localhost, credenciales y rutas adicionales', () => {
  const h = harness();
  for (const value of ['', 'http://localhost:5000', 'https://a:b@api.example.invalid', 'https://api.example.invalid/api']) {
    h.env.EXPO_PUBLIC_API_URL = value;
    assert.throws(() => h.load('api').apiBaseUrl());
  }
});
test('SecureStore persiste solo sesión y permite eliminarla; fallos se propagan', async () => {
  let stored = null;
  const h = harness(undefined, { isAvailableAsync: async () => true,
    setItemAsync: async (_key, value) => { stored = value; }, getItemAsync: async () => stored,
    deleteItemAsync: async () => { stored = null; }, WHEN_UNLOCKED_THIS_DEVICE_ONLY: 1 });
  const store = h.load('sessionStore');
  await store.saveSession({ token, expiresAt: Date.now() + 10000, api: 'https://api.example.invalid' });
  assert.deepEqual(Object.keys(JSON.parse(stored)).sort(), ['api', 'expiresAt', 'token']);
  assert.equal((await store.readSession()).token, token);
  await store.deleteSession();
  assert.equal(await store.readSession(), null);
  const unavailable = harness(undefined, { isAvailableAsync: async () => false }).load('sessionStore');
  await assert.rejects(unavailable.readSession(), /no está disponible/);
});


test('APK bloquea HTTP salvo preview-local y origen LAN exacto', () => {
  for (const allowed of [undefined, 'false', 'true']) {
    const h = harness(undefined, {}, false);
    h.env.EXPO_PUBLIC_LOCAL_API_ALLOWED = allowed;
    for (const url of ['http://192.168.2.232:5000', 'http://192.168.2.233:5000', 'http://192.168.2.232:5001', 'https://api.example.invalid']) {
      h.env.EXPO_PUBLIC_API_URL = url;
      if (url.startsWith('https:') || (allowed === 'true' && url === 'http://192.168.2.232:5000')) assert.equal(h.load('api').apiBaseUrl(), url);
      else assert.throws(() => h.load('api').apiBaseUrl(), /HTTPS/);
    }
  }
});
