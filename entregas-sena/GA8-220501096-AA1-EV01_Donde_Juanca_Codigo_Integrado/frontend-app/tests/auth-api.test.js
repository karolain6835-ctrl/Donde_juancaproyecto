import test from 'node:test';
import assert from 'node:assert/strict';
import { apiClient, ApiError, configureUnauthorizedHandler } from '../src/services/apiClient.js';
import { readSession, saveSession, clearSession, isUsableSession } from '../src/services/sessionStorage.js';

const token = '{{token}}';
const user = { id: 'u1', nombre: 'Ana', rol: 'Mesera', correo: 'ana@example.invalid' };

function storage() {
  const data = new Map();
  return { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value), removeItem: key => data.delete(key) };
}

test('Infraestructura de sesión y API', async t => {
  const originalFetch = globalThis.fetch;
  const originalStorage = globalThis.localStorage;
  globalThis.localStorage = storage();
  let unauthorized = 0;
  const cleanup = configureUnauthorizedHandler(() => { unauthorized++; clearSession(); });
  try {
    await t.test('login persiste y recarga restaura usuario y token', () => {
      saveSession(token, user);
      assert.deepEqual(readSession(), { token, user });
    });
    await t.test('logout elimina ambas claves', () => {
      clearSession();
      assert.deepEqual(readSession(), { token: null, user: null });
      assert.equal(localStorage.getItem('dondejuanca_usuario'), null);
    });
    await t.test('sesión incompleta, corrupta o de formato inválido se limpia', () => {
      for (const [storedToken, storedUser] of [[token, '{'], [null, JSON.stringify(user)], ['Bearer bad', JSON.stringify(user)], [token, '[]'], [token, '{}']]) {
        clearSession();
        if (storedToken) localStorage.setItem('dondejuanca_token', storedToken);
        localStorage.setItem('dondejuanca_usuario', storedUser);
        assert.deepEqual(readSession(), { token: null, user: null });
        assert.equal(localStorage.getItem('dondejuanca_token'), null);
        assert.equal(localStorage.getItem('dondejuanca_usuario'), null);
      }
      assert.equal(isUsableSession(token, user), true);
    });
    await t.test('fallo al guardar no deja sesión parcial', () => {
      const validStorage = globalThis.localStorage;
      globalThis.localStorage = { ...validStorage, setItem(key, value) {
        if (key === 'dondejuanca_token') throw new Error('bloqueado');
        validStorage.setItem(key, value);
      } };
      assert.throws(() => saveSession(token, user));
      assert.equal(localStorage.getItem('dondejuanca_usuario'), null);
      globalThis.localStorage = validStorage;
    });
    await t.test('Bearer automático, JSON, método y headers adicionales', async () => {
      saveSession(token, user);
      globalThis.fetch = async (url, options) => {
        assert.equal(url, 'http://localhost:5000/api/prueba');
        assert.equal(options.method, 'POST');
        assert.equal(options.headers.get('Authorization'), `Bearer ${token}`);
        assert.equal(options.headers.get('Content-Type'), 'application/json');
        assert.equal(options.headers.get('X-Prueba'), 'ok');
        assert.deepEqual(JSON.parse(options.body), { valor: 2 });
        return new Response('{"datos":[1]}');
      };
      assert.deepEqual(await apiClient('/prueba', { method: 'POST', body: { valor: 2 }, headers: { 'X-Prueba': 'ok' } }), { datos: [1] });
    });
    await t.test('401 de login público no cierra sesión ni envía Bearer', async () => {
      globalThis.fetch = async (_, options) => {
        assert.equal(options.headers.has('Authorization'), false);
        return new Response('{"error":"Credenciales inválidas"}', { status: 401 });
      };
      await assert.rejects(apiClient('/usuarios/login', { auth: false }), e => e.status === 401 && e.code === 'UNAUTHORIZED');
      assert.equal(unauthorized, 0);
      assert.equal(readSession().token, token);
    });
    await t.test('403 distinguible conserva sesión', async () => {
      globalThis.fetch = async () => new Response('{"error":"Sin permiso"}', { status: 403 });
      await assert.rejects(apiClient('/protegida'), e => e instanceof ApiError && e.status === 403 && e.code === 'FORBIDDEN' && e.message === 'Sin permiso');
      assert.equal(unauthorized, 0);
      assert.equal(readSession().token, token);
    });
    await t.test('401 protegido por token inválido o expirado limpia sesión', async () => {
      globalThis.fetch = async () => new Response('', { status: 401 });
      await assert.rejects(apiClient('/protegida'), e => e.status === 401);
      assert.equal(unauthorized, 1);
      assert.deepEqual(readSession(), { token: null, user: null });
    });
    await t.test('401 antiguo no elimina una sesión nueva', async () => {
      saveSession(token, user);
      globalThis.fetch = async () => {
        saveSession(token + 'new', user);
        return new Response('', { status: 401 });
      };
      await assert.rejects(apiClient('/protegida'));
      assert.equal(unauthorized, 1);
      assert.equal(readSession().token, token + 'new');
    });
    await t.test('404 HTML devuelve error HTTP estructurado', async () => {
      globalThis.fetch = async () => new Response('<html>No encontrado</html>', { status: 404 });
      await assert.rejects(apiClient('/inexistente'), e => e.status === 404 && e.code === 'HTTP_ERROR' && e.data === null);
    });
    await t.test('204 y JSON inválido no rompen el parseo', async () => {
      globalThis.fetch = async () => new Response(null, { status: 204 });
      assert.equal(await apiClient('/sin-body'), null);
      globalThis.fetch = async () => new Response('no JSON');
      assert.equal(await apiClient('/texto'), null);
    });
    await t.test('fallo de red distinguible y sin logout', async () => {
      globalThis.fetch = async () => { throw new TypeError('Failed to fetch'); };
      await assert.rejects(apiClient('/protegida'), e => e.status === null && e.code === 'NETWORK_ERROR');
      assert.equal(unauthorized, 1);
    });
  } finally {
    cleanup();
    globalThis.fetch = originalFetch;
    if (originalStorage === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = originalStorage;
  }
});
