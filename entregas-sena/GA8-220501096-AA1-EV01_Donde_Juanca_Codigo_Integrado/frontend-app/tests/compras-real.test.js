import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { createServer } from 'vite';
import { compraBody, recepcionBody, motivoBody, crearIntentoRecepcion, sincronizarCompra, estadosCompra, listarCompras, detalleCompra, crearCompra, recibirCompra, listarRecepciones, detalleRecepcion, cancelarPendiente, reversarRecepcion } from '../src/services/comprasService.js';
import { configureUnauthorizedHandler } from '../src/services/apiClient.js';
import { can } from '../src/utils/permissions.js';

const form = { proveedores_id: 'proveedor-real', usuarios_id: 'no-enviar', items: [
  { productos_id: 'p1', cantidad: '10', costo: '2.844,44' },
  { productos_id: 'p2', cantidad: '5', costo: '3.500' },
] };
const compra = { id: 'compra-real', estado: 'pendiente', total_estimado: '45944.40', total_recibido: '0.00', proveedores_id: 'proveedor-real', usuarios_id: 'creador-jwt', modelo_recepcion: 'v2', creado_en: '2026-10-14T16:00:00Z', items: [
  { id: 'i1', productos_id: 'p1', cantidad: 10, cantidad_recibida: 0, cantidad_cancelada: 0, cantidad_pendiente: 10, precio_unitario: '2844.44' },
  { id: 'i2', productos_id: 'p2', cantidad: 5, cantidad_recibida: 0, cantidad_cancelada: 0, cantidad_pendiente: 5, precio_unitario: '3500.00' },
] };
const recepcion = { id: 'recepcion-real', compras_id: compra.id, estado: 'confirmada', recibida_por: 'receptor-jwt', recibida_en: '2026-10-14T16:10:00Z', items: [{ id: 'ri1', productos_id: 'p1', compra_items_id: 'i1', cantidad_recibida: 3 }] };
const paginacion = { pagina: 1, limite: 20, total: 1, total_paginas: 1 };

test('Compra: proveedor real, múltiples ítems, COP decimal y ausencia de actor/CPP', () => {
  assert.deepEqual(compraBody(form), { proveedores_id: 'proveedor-real', items: [
    { productos_id: 'p1', cantidad: 10, precio_unitario: 2844.44 },
    { productos_id: 'p2', cantidad: 5, precio_unitario: 3500 },
  ] });
});
test('Compra: rechaza proveedor vacío, productos duplicados y cantidades/costos inválidos', () => {
  assert.throws(() => compraBody({ ...form, proveedores_id: '' }));
  assert.throws(() => compraBody({ ...form, items: [] }));
  assert.throws(() => compraBody({ ...form, items: [form.items[0], { ...form.items[0], productos_id: 'P1' }] }));
  for (const cantidad of ['', 0, -1, 0.5, null, 2147483648]) assert.throws(() => compraBody({ ...form, items: [{ ...form.items[0], cantidad }] }));
  for (const costo of ['', '0', '-1', '2,444', '100.000.000', '3.5']) assert.throws(() => compraBody({ ...form, items: [{ ...form.items[0], costo }] }));
});
test('Recepción total usa todos los pendientes explícitos; parcial omite ceros', () => {
  assert.deepEqual(recepcionBody(compra), { items: [{ compra_item_id: 'i1', cantidad_recibida: 10 }, { compra_item_id: 'i2', cantidad_recibida: 5 }] });
  assert.deepEqual(recepcionBody(compra, { i1: '3', i2: '0' }), { items: [{ compra_item_id: 'i1', cantidad_recibida: 3 }] });
  const parcial = { ...compra, estado: 'parcialmente_recibida', items: [{ ...compra.items[0], cantidad_pendiente: 2 }] };
  assert.equal(recepcionBody(parcial).items[0].cantidad_recibida, 2);
});
test('Recepción rechaza sobre-recepción, vacíos, fracciones y estados cerrados', () => {
  for (const quantities of [{}, { i1: 11 }, { i1: -1 }, { i1: 1.5 }]) assert.throws(() => recepcionBody(compra, quantities));
  for (const estado of ['recibida', 'cancelada', 'cerrada_parcial']) assert.throws(() => recepcionBody({ ...compra, estado }));
});
test('Recepción legado pendiente se envía sin inventar cantidades recibidas históricas', () => {
  const legacy = { ...compra, modelo_recepcion: 'legado', items: [{ ...compra.items[0], cantidad_pendiente: null, cantidad_recibida: null }] };
  assert.equal(recepcionBody(legacy).items[0].cantidad_recibida, 10);
});
test('Idempotencia conserva clave al reintentar, cambiar y restaurar el mismo envío', () => {
  let count = 0;
  const attempt = crearIntentoRecepcion(() => `key-${++count}`);
  const body = recepcionBody(compra);
  assert.equal(attempt.key(compra.id, body), 'key-1');
  assert.equal(attempt.key(compra.id, { items: [...body.items].reverse() }), 'key-1');
  assert.equal(attempt.key(compra.id, recepcionBody(compra, { i1: 3 })), 'key-2');
  assert.equal(attempt.key(compra.id, body), 'key-1');
  assert.equal(attempt.key('otra-compra', body), 'key-3');
  attempt.clear(); assert.equal(attempt.key(compra.id, body), 'key-4');
});
test('Cancelación/reverso requieren motivo real no vacío, sin actor', () => {
  assert.deepEqual(motivoBody('  Mercancía incorrecta  '), { motivo: 'Mercancía incorrecta' });
  for (const value of ['', ' ', null, 'a'.repeat(501)]) assert.throws(() => motivoBody(value));
});
test('Sincronización consulta compra, recepciones, productos e inventario después de confirmar', async () => {
  const events = [];
  await sincronizarCompra(async () => { events.push('confirmada'); return compra; }, ['compras', 'detalle', 'recepciones', 'productos', 'inventario'].map(name => async () => events.push(name)));
  assert.deepEqual(events, ['confirmada', 'compras', 'detalle', 'recepciones', 'productos', 'inventario']);
});
test('Reverso 409 no ejecuta reconsulta de éxito ni cambia snapshots locales', async () => {
  const snapshot = structuredClone(compra); let refreshed = false;
  await assert.rejects(sincronizarCompra(async () => { throw Object.assign(new Error('Operaciones posteriores; requiere conciliacion.'), { status: 409 }); }, [async () => { refreshed = true; }]), { status: 409 });
  assert.equal(refreshed, false); assert.deepEqual(compra, snapshot);
});
test('Estados y permisos conservan exactamente la matriz existente', () => {
  assert.deepEqual(Object.keys(estadosCompra), ['pendiente', 'parcialmente_recibida', 'recibida', 'cancelada', 'cerrada_parcial']);
  for (const rol of ['Administrador', 'SuperAdmin', 'Mesero', 'Mesera', 'Bartender', 'Cajero']) for (const permission of ['ver', 'crear', 'recibir', 'cancelar', 'reversar']) assert.equal(can({ rol }, `compras.${permission}`), ['Administrador', 'SuperAdmin'].includes(rol));
});
test('Compras HTTP con apiClient: rutas, bodies, JWT, idempotencia y errores reales', async t => {
  const oldFetch = globalThis.fetch, oldStorage = globalThis.localStorage;
  globalThis.localStorage = { getItem: () => 'token-real' };
  let current, status = 200, response;
  globalThis.fetch = async (url, options) => { current = { url, ...options }; return new Response(JSON.stringify(response), { status }); };
  let unauthorized = 0; const cleanup = configureUnauthorizedHandler(() => unauthorized++);
  try {
    await t.test('crear POST 201 sin actor y sin costo promedio', async () => {
      status = 201; response = { datos: compra };
      await crearCompra(form);
      assert.ok(current.url.endsWith('/compras')); assert.equal(current.method, 'POST');
      assert.deepEqual(JSON.parse(current.body), compraBody(form)); assert.equal(current.headers.get('Authorization'), 'Bearer token-real');
      assert.doesNotMatch(current.body, /usuarios_id|cpp|costo_promedio/);
    });
    await t.test('listar aplica filtros reales y paginación', async () => {
      status = 200; response = { datos: [compra], paginacion };
      assert.equal((await listarCompras({ estado: 'pendiente', proveedores_id: 'proveedor-real', pagina: 2 })).datos[0].id, compra.id);
      const url = new URL(current.url); assert.equal(url.searchParams.get('pagina'), '2'); assert.equal(url.searchParams.get('proveedores_id'), form.proveedores_id);
    });
    await t.test('detalle usa datos e ítems del servidor', async () => {
      response = { datos: compra }; assert.deepEqual(await detalleCompra(compra.id), compra);
    });
    await t.test('recepción parcial PATCH con clave estable tras respuesta perdida', async () => {
      const attempts = crearIntentoRecepcion(() => 'key-retry'), body = recepcionBody(compra, { i1: '3' });
      const mockFetch = globalThis.fetch;
      globalThis.fetch = async () => { throw new Error('Respuesta perdida'); };
      await assert.rejects(recibirCompra(compra.id, body, attempts.key(compra.id, body)), e => e.code === 'NETWORK_ERROR');
      globalThis.fetch = mockFetch; response = { datos: compra, recepcion };
      await recibirCompra(compra.id, body, attempts.key(compra.id, body));
      assert.ok(current.url.endsWith('/recibir')); assert.equal(current.method, 'PATCH'); assert.equal(current.headers.get('Idempotency-Key'), 'key-retry'); assert.deepEqual(JSON.parse(current.body), body);
    });
    await t.test('recepción total también envía pendientes explícitos con clave', async () => {
      response = { datos: compra, recepcion }; await recibirCompra(compra.id, recepcionBody(compra), 'key-total');
      assert.equal(JSON.parse(current.body).items.length, 2);
    });
    await t.test('listado y detalle de recepciones usan contratos reales', async () => {
      response = { datos: [recepcion], paginacion }; assert.equal((await listarRecepciones(compra.id, { pagina: 2 })).datos[0].id, recepcion.id);
      assert.match(current.url, /recepciones\?pagina=2/);
      response = { recepcion }; assert.deepEqual(await detalleRecepcion(compra.id, recepcion.id), recepcion);
    });
    await t.test('cancelar pendiente manda motivo y admite cerrada_parcial del backend', async () => {
      response = { datos: { ...compra, estado: 'cerrada_parcial' } };
      assert.equal((await cancelarPendiente(compra.id, 'Sin disponibilidad')).datos.estado, 'cerrada_parcial');
      assert.ok(current.url.endsWith('/cancelar-pendiente')); assert.deepEqual(JSON.parse(current.body), { motivo: 'Sin disponibilidad' });
    });
    await t.test('reverso exitoso mantiene respuesta y motivo', async () => {
      response = { datos: compra, recepcion: { ...recepcion, estado: 'reversada' } };
      assert.equal((await reversarRecepcion(compra.id, recepcion.id, 'Error de entrega')).recepcion.estado, 'reversada');
      assert.ok(current.url.endsWith('/recepciones/recepcion-real/reversar')); assert.deepEqual(JSON.parse(current.body), { motivo: 'Error de entrega' });
    });
    for (const code of [400, 401, 403, 404, 409, 500]) await t.test(`propaga ${code} con mensaje real`, async () => {
      status = code; response = { error: `Mensaje real ${code}` };
      await assert.rejects(reversarRecepcion(compra.id, recepcion.id, 'Motivo'), e => e.status === code && e.message === `Mensaje real ${code}`);
    });
    assert.equal(unauthorized, 1);
  } finally { globalThis.fetch = oldFetch; globalThis.localStorage = oldStorage; cleanup(); }
});
test('Formulario real presenta proveedores activos, productos con códigos y costo COP', async () => {
  const server = await createServer({ root: fileURLToPath(new URL('..', import.meta.url)), server: { middlewareMode: true }, appType: 'custom' });
  try {
    const { default: Form } = await server.ssrLoadModule('/src/components/CompraForm.jsx');
    const { AuthContext } = await server.ssrLoadModule('/src/context/useAuth.js');
    const html = renderToString(React.createElement(AuthContext.Provider, { value: { user: { rol: 'Administrador' } } }, React.createElement(Form, {
      proveedores: { data: [{ id: 'proveedor-real', nombre: 'Proveedor real', estado: 'activo' }, { id: 'inactivo', nombre: 'Proveedor inactivo', estado: 'inactivo' }] },
      productos: { data: [{ id: 'p1', codigo: 'CERV-005', nombre: 'Poker prueba 330ml', stock: 6 }] },
    })));
    assert.match(html, /value="proveedor-real"/); assert.doesNotMatch(html, /Proveedor inactivo/);
    assert.match(html, /CERV-005/); assert.match(html, /Poker prueba 330ml/); assert.match(html, /inputMode="decimal"/); assert.match(html, /Agregar producto/);
    assert.doesNotMatch(html, /usuarios_id|costo_promedio/);
  } finally { await server.close(); }
});
test('Detalle muestra stock/CPP devueltos por backend y conserva formularios de confirmación', async () => {
  const resources = [
    { data: compra, loading: false },
    { data: { datos: [recepcion], paginacion }, loading: false },
  ];
  globalThis.__comprasTestResources = resources;
  const server = await createServer({ root: fileURLToPath(new URL('..', import.meta.url)), server: { middlewareMode: true }, appType: 'custom', plugins: [{
    name: 'compras-test-resources', enforce: 'pre',
    transform(source, filename) {
      if (filename.replaceAll('\\', '/').endsWith('/hooks/useRemoteCatalog.js')) return source.replace('export function useRemoteCatalog(loader) {', 'export function useRemoteCatalog(loader) { if (globalThis.__comprasTestResources) return globalThis.__comprasTestResources.shift();');
    },
  }] });
  try {
    const { default: Detail } = await server.ssrLoadModule('/src/components/CompraDetalle.jsx');
    const { AuthContext } = await server.ssrLoadModule('/src/context/useAuth.js');
    const html = renderToString(React.createElement(AuthContext.Provider, { value: { user: { rol: 'Administrador' } } }, React.createElement(Detail, {
      id: compra.id, proveedores: { data: [{ id: form.proveedores_id, nombre: 'Proveedor real' }] },
      productos: { data: [{ id: 'p1', nombre: 'Producto real', stock: 73, costo: 9876.54 }] }, intentos: crearIntentoRecepcion(),
    })));
    assert.match(html, /Stock disponible: <!-- -->73/); assert.match(html, /9\.876,54/);
    assert.match(html, /Recibir todo lo pendiente/); assert.match(html, /Recibir cantidades indicadas/); assert.match(html, /Cancelar saldo pendiente/); assert.match(html, /Reversar recepción/);
    assert.match(html, /receptor-jwt/); assert.match(html, /max="10"/);
  } finally { delete globalThis.__comprasTestResources; await server.close(); }
});
test('Compras elimina mocks y usa utilidades comunes sin calcular CPP en React', async () => {
  const files = ['../src/pages/ComprasPage.jsx', '../src/components/CompraForm.jsx', '../src/components/CompraDetalle.jsx', '../src/services/comprasService.js'];
  const sources = await Promise.all(files.map(file => readFile(new URL(file, import.meta.url), 'utf8')));
  for (const source of sources) assert.doesNotMatch(source, /OC-\d|fetch\(|localhost:5000|calcularCPP|setOrdenes/);
  assert.match(sources[2], /formatCurrency\(productos\.data\.find\(p => p\.id === item\.productos_id\)\.costo\)/);
});

test('Listado real de compras: loading, error/reintento, vacío, datos y permisos', async t => {
  const server = await createServer({ root: fileURLToPath(new URL('..', import.meta.url)), server: { middlewareMode: true }, appType: 'custom', plugins: [{
    name: 'compras-page-test-resources', enforce: 'pre',
    transform(source, filename) {
      if (filename.replaceAll('\\', '/').endsWith('/hooks/useRemoteCatalog.js')) return source.replace('export function useRemoteCatalog(loader) {', 'export function useRemoteCatalog(loader) { if (globalThis.__comprasPageResources) return globalThis.__comprasPageResources.shift();');
    },
  }] });
  try {
    const { default: Page } = await server.ssrLoadModule('/src/pages/ComprasPage.jsx');
    const { AuthContext } = await server.ssrLoadModule('/src/context/useAuth.js');
    const render = (orders, rol = 'Administrador') => {
      globalThis.__comprasPageResources = [orders, { data: [{ id: form.proveedores_id, nombre: 'Proveedor real' }] }, { data: [] }];
      return renderToString(React.createElement(AuthContext.Provider, { value: { user: { rol } } }, React.createElement(Page)));
    };
    await t.test('loading', () => assert.match(render({ loading: true }), /Cargando/));
    await t.test('error y reintento', () => {
      const html = render({ error: 'Error real de consulta' });
      assert.match(html, /Error real de consulta/); assert.match(html, /Reintentar/);
    });
    await t.test('vacío', () => assert.match(render({ data: { datos: [], paginacion: { ...paginacion, total: 0 } } }), /No hay compras para mostrar/));
    await t.test('datos, proveedor, totales, creador y estados reales', () => {
      const html = render({ data: { datos: [{ ...compra, estado: 'parcialmente_recibida', total_recibido: '8533.32' }], paginacion } });
      assert.match(html, /compra-real/); assert.match(html, /Proveedor real/); assert.match(html, /creador-jwt/); assert.match(html, /45\.944,40/); assert.match(html, /8\.533,32/); assert.match(html, /Parcialmente recibida/); assert.match(html, /Ver detalle/);
    });
    await t.test('Cajero no obtiene controles de compras', () => {
      const html = render({ data: { datos: [compra], paginacion } }, 'Cajero');
      assert.match(html, /No tienes permiso/); assert.doesNotMatch(html, /Nueva compra|Ver detalle/);
    });
  } finally { delete globalThis.__comprasPageResources; await server.close(); }
});
