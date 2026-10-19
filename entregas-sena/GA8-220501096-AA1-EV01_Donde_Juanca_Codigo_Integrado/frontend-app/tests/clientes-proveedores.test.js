import test from 'node:test';
import assert from 'node:assert/strict';
import { adaptClientes, clienteBody, listarClientes, crearCliente, actualizarCliente } from '../src/services/clientesService.js';
import { adaptProveedores, proveedorBody, listarProveedores, crearProveedor, actualizarProveedor } from '../src/services/proveedoresService.js';
import { configureUnauthorizedHandler } from '../src/services/apiClient.js';
import { can } from '../src/utils/permissions.js';

const cliente = { id: 'cli-real', nombre: 'Ana', email: 'ana@example.com', telefono: null, estado: 'activo', usuarios_id: 'actor-servidor' };
const proveedor = { id: 'prov-real', contacto_nombre: 'Contacto', email: null, telefono: '3001234567', estado: 'activo' };

test('Clientes adapta paginación y contactos sin inventar métricas', () => {
  const result = adaptClientes({ pagina: 2, limite: 20, total: 21, datos: [cliente] });
  assert.equal(result.pagina, 2); assert.equal(result.total, 21);
  assert.deepEqual(Object.keys(result.datos[0]).sort(), ['id','nombre','email','telefono','estado'].sort());
  assert.equal(result.datos[0].telefono, null);
});
test('Contratos inválidos no se convierten en catálogo vacío', () => {
  for (const value of [null, {}, { datos: {} }, { data: [] }]) {
    assert.throws(() => adaptClientes(value), e => e.code === 'INVALID_RESPONSE');
    assert.throws(() => adaptProveedores(value), e => e.code === 'INVALID_RESPONSE');
  }
  assert.throws(() => adaptClientes({ pagina: 0, limite: 20, total: 1, datos: [cliente] }));
  assert.throws(() => adaptClientes({ pagina: 1, limite: 20, total: 1, datos: [{ ...cliente, estado: 'otro' }] }));
  assert.throws(() => adaptProveedores({ datos: [{ ...proveedor, contacto_nombre: 123 }] }));
  assert.deepEqual(adaptProveedores({ datos: [] }), []);
});
test('Alta cliente envía solo contacto, sin identidad, estado ni ID local', () => {
  assert.deepEqual(clienteBody({ ...cliente, usuarios_id: 'otro', creado_por: 'otro', actualizado_por: 'otro', documento: 'mock' }), { nombre: 'Ana', email: 'ana@example.com', telefono: null });
  assert.deepEqual(clienteBody({ nombre: ' Luis ', email: '', telefono: ' ' }), { nombre: 'Luis', email: null, telefono: null });
});
test('Cliente admite actualización parcial y cambio de estado', () => {
  assert.deepEqual(clienteBody({ estado: 'inactivo' }, true), { estado: 'inactivo' });
  assert.deepEqual(clienteBody({ email: null }, true), { email: null });
});
for (const form of [{ nombre: '' }, { nombre: ' ' }, { nombre: 'a'.repeat(101) }, { nombre: 'Ana', email: 'mal' }, { nombre: 'Ana', telefono: '1'.repeat(21) }]) {
  test(`Validación cliente ${JSON.stringify(form).slice(0, 45)}`, () => assert.throws(() => clienteBody(form), e => e.code === 'VALIDATION_ERROR'));
}
test('Proveedor adapta campos reales y mantiene etiqueta compatible con Productos', () => {
  const [row] = adaptProveedores({ datos: [proveedor] });
  assert.equal(row.id, proveedor.id); assert.equal(row.nombre, proveedor.contacto_nombre); assert.equal(row.telefono, proveedor.telefono);
  assert.equal(adaptProveedores({ datos: [{ ...proveedor, contacto_nombre: null }] })[0].nombre, proveedor.telefono);
});
test('Proveedor usa campos del contrato y permite contactos nulos', () => {
  assert.deepEqual(proveedorBody({ ...proveedor, nombre: 'No enviar', usuarios_id: 'otro' }), { contacto_nombre: 'Contacto', telefono: '3001234567', email: null, estado: 'activo' });
  assert.deepEqual(proveedorBody({ estado: 'inactivo' }), { estado: 'inactivo' });
  assert.throws(() => proveedorBody({ contacto_nombre: 'a'.repeat(101) }));
  assert.throws(() => proveedorBody({ estado: 'otro' }));
});
test('Permisos reales de clientes y proveedores', () => {
  for (const rol of ['Administrador','SuperAdmin','Mesero','Mesera','Bartender','Cajero']) {
    const admin = ['Administrador','SuperAdmin'].includes(rol);
    assert.equal(can({ rol }, 'clientes.crear'), rol !== 'Bartender');
    assert.equal(can({ rol }, 'clientes.actualizar'), admin);
    for (const action of ['proveedores.ver','proveedores.crear','proveedores.editar']) assert.equal(can({ rol }, action), admin);
  }
});

test('Catálogos: solicitudes mediante apiClient, errores y sesión', async t => {
  const originalFetch = globalThis.fetch, originalStorage = globalThis.localStorage;
  let token = 'token-real', logout = 0;
  const calls = [];
  globalThis.localStorage = { getItem: () => token };
  const cleanup = configureUnauthorizedHandler(() => { token = null; logout++; });
  const respond = (data, status = 200) => { globalThis.fetch = async (url, options) => {
    calls.push({ url, ...options }); return new Response(JSON.stringify(data), { status });
  }; };
  try {
    await t.test('Listado clientes usa filtros, búsqueda literal y paginación', async () => {
      respond({ pagina: 2, limite: 20, total: 21, datos: [cliente] });
      await listarClientes({ pagina: 2, buscar: 'Ana & Luis', estado: 'activo' });
      const query = new URL(calls.at(-1).url).searchParams;
      assert.equal(query.get('buscar'), 'Ana & Luis'); assert.equal(query.get('pagina'), '2'); assert.equal(query.get('estado'), 'activo');
      assert.equal(calls.at(-1).headers.get('Authorization'), 'Bearer token-real');
    });
    await t.test('Crear cliente sin actor y con respuesta cliente', async () => {
      respond({ cliente }, 201); assert.equal((await crearCliente({ ...cliente, usuarios_id: 'otro' })).id, cliente.id);
      assert.match(calls.at(-1).url, /\/clientes\/registrar$/);
      assert.deepEqual(Object.keys(JSON.parse(calls.at(-1).body)).sort(), ['nombre','email','telefono'].sort());
    });
    await t.test('Editar cliente y estado mediante PUT', async () => {
      respond({ cliente: { ...cliente, estado: 'inactivo' } });
      assert.equal((await actualizarCliente(cliente.id, { estado: 'inactivo' })).estado, 'inactivo');
      assert.equal(calls.at(-1).method, 'PUT'); assert.deepEqual(JSON.parse(calls.at(-1).body), { estado: 'inactivo' });
    });
    await t.test('Listado proveedores conserva compatibilidad para selector Productos', async () => {
      respond({ datos: [proveedor] }); const rows = await listarProveedores();
      assert.equal(rows[0].nombre, 'Contacto'); assert.equal(rows[0].id, 'prov-real');
      assert.equal(calls.at(-1).method, 'GET'); assert.match(calls.at(-1).url, /\/proveedores$/);
    });
    await t.test('Crear y actualizar proveedor sin campos inventados', async () => {
      respond({ datos: proveedor }, 201); await crearProveedor({ ...proveedor, usuarios_id: 'otro', nombre: 'mock' });
      assert.equal(calls.at(-1).method, 'POST'); assert.equal('usuarios_id' in JSON.parse(calls.at(-1).body), false); assert.equal('nombre' in JSON.parse(calls.at(-1).body), false);
      respond({ datos: { ...proveedor, estado: 'inactivo' } });
      assert.equal((await actualizarProveedor(proveedor.id, { estado: 'inactivo' })).estado, 'inactivo'); assert.equal(calls.at(-1).method, 'PUT');
    });
    for (const status of [400, 404, 409]) await t.test(`Error ${status} conserva mensaje de negocio`, async () => {
      respond({ error: 'Error de negocio' }, status);
      await assert.rejects(actualizarCliente(cliente.id, { estado: 'activo' }), error => error.status === status && error.message === 'Error de negocio');
      await assert.rejects(actualizarProveedor(proveedor.id, { estado: 'activo' }), error => error.status === status);
    });
    await t.test('403 de catálogos conserva sesión', async () => {
      respond({ error: 'Sin permiso' }, 403);
      await assert.rejects(listarClientes(), error => error.code === 'FORBIDDEN');
      await assert.rejects(listarProveedores(), error => error.code === 'FORBIDDEN');
      assert.equal(token, 'token-real'); assert.equal(logout, 0);
    });
    await t.test('401 utiliza cierre global de sesión', async () => {
      respond({ error: 'Vencido' }, 401);
      await assert.rejects(listarClientes(), error => error.code === 'UNAUTHORIZED');
      assert.equal(token, null); assert.equal(logout, 1);
    });
    await t.test('Respuesta exitosa mal formada se rechaza', async () => {
      respond({});
      for (const operation of [() => crearCliente(cliente), () => crearProveedor(proveedor), () => listarClientes(), () => listarProveedores()]) await assert.rejects(operation(), error => error.code === 'INVALID_RESPONSE');
    });
  } finally {
    cleanup(); globalThis.fetch = originalFetch;
    if (originalStorage === undefined) delete globalThis.localStorage; else globalThis.localStorage = originalStorage;
  }
});
