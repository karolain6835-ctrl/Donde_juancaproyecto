import test from 'node:test';
import assert from 'node:assert/strict';
import { adaptProductos, productoBody, listarProductos, crearProducto, actualizarProducto, eliminarProducto } from '../src/services/productosService.js';
import { adaptCategorias, listarCategorias } from '../src/services/categoriasService.js';
import { listarProveedores } from '../src/services/proveedoresService.js';
import { configureUnauthorizedHandler } from '../src/services/apiClient.js';
import { can } from '../src/utils/permissions.js';
import { formatCurrency } from '../src/utils/formatCurrency.js';

const row = { id: 'producto-real', nombre: 'Producto', codigo: 'P1', categoria_nombre: 'Categoria real', cantidad_disponible: 3, stock_minimo: 5, costo_promedio_ponderado: '2844.44', precio_venta: '19560.00', estado: 'activo', categorias_id: 28, proveedores_id: 'proveedor-real', historial_costos_id: 'historial-existente' };
const form = { nombre: ' Producto ', codigo: ' P1 ', precio_venta: '2844.44', stock_minimo: '5', cantidad: '3', categorias_id: '28', proveedores_id: 'proveedor-real', historial_costos_id: 'historial-existente', estado: 'activo', costo_promedio: '9999.99' };

test('Adaptación explícita preserva decimales y relaciones', () => {
  const [p] = adaptProductos({ datos: [row] });
  assert.equal(p.costo, 2844.44); assert.equal(p.precio, 19560); assert.equal(p.stock, 3);
  assert.equal(p.categorias_id, '28'); assert.equal(p.estadoStock, 'bajo');
  assert.equal(formatCurrency(p.costo).replace(/\s/g, ''), '$2.844,44');
});
test('Stock solo usa agotado, bajo y normal', () => {
  for (const [stock, expected] of [[-1, 'agotado'], [0, 'agotado'], [1, 'bajo'], [5, 'bajo'], [6, 'normal']]) assert.equal(adaptProductos({ datos: [{ ...row, cantidad_disponible: stock }] })[0].estadoStock, expected);
});
test('Categorías reales conservan ID y descripción nullable', () => {
  assert.deepEqual(adaptCategorias({ datos: [{ id: 28, nombre: 'Categoria real', descripcion: null, activo: 1 }] }), [{ id: '28', nombre: 'Categoria real', descripcion: '', activo: true }]);
});
test('Contrato inesperado no se transforma en lista vacía', () => {
  for (const value of [null, {}, { data: [] }, { datos: {} }]) {
    for (const adapt of [adaptProductos, adaptCategorias]) assert.throws(() => adapt(value), e => e.code === 'INVALID_RESPONSE');
  }
  assert.throws(() => adaptProductos({ datos: [{ ...row, precio_venta: 'mal' }] }), e => e.code === 'INVALID_RESPONSE');
  assert.throws(() => adaptProductos({ datos: [{ ...row, nombre: null }] }), e => e.code === 'INVALID_RESPONSE');
  assert.throws(() => adaptCategorias({ datos: [{ id: 28 }] }), e => e.code === 'INVALID_RESPONSE');
  assert.deepEqual(adaptProductos({ datos: [] }), []);
});
for (const precio of [0, -1, 'mal', '', ' ', null, undefined, Infinity, NaN]) test(`Validación de precio: ${String(precio)}`, () => {
  assert.throws(() => productoBody({ ...form, precio_venta: precio }, true), e => e.code === 'VALIDATION_ERROR');
});
test('PUT no incluye stock, CPP ni historial interno', () => {
  const body = productoBody(form, true);
  assert.equal(body.precio_venta, 2844.44);
  assert.equal('historial_costos_id' in body, false);
  assert.deepEqual(Object.keys(body).sort(), ['nombre','codigo','precio_venta','stock_minimo','categorias_id','proveedores_id','estado'].sort());
});
test('Alta sin historial previo y con CPP excluido', () => {
  const body = productoBody({ ...form, historial_costos_id: null });
  assert.equal(body.cantidad, 3);
  assert.equal('historial_costos_id' in body, false);
  assert.equal('costo_promedio' in body, false);
  assert.equal('costo_promedio_ponderado' in body, false);
});
test('Los siete campos visibles válidos bastan, con cantidades y mínimo en cero', () => {
  const visible = { nombre: 'Producto', codigo: 'P1', precio_venta: '2844.44', cantidad: '0', stock_minimo: '0', categorias_id: '28', proveedores_id: 'proveedor-real' };
  const body = productoBody(visible);
  assert.deepEqual(Object.keys(body).sort(), Object.keys(visible).sort());
  assert.equal(body.precio_venta, 2844.44);
  assert.equal(body.cantidad, 0);
  assert.equal(body.stock_minimo, 0);
});
test('Listado admite productos nuevos sin historial y productos legados', () => {
  const rows = adaptProductos({ datos: [row, { ...row, id: 'nuevo', historial_costos_id: null, costo_promedio_ponderado: '0.00' }] });
  assert.equal(rows[0].historial_costos_id, 'historial-existente');
  assert.equal(rows[1].historial_costos_id, null);
  assert.equal(rows[1].costo, 0);
});
test('Campos obligatorios y enteros validados', () => {
  for (const change of [{ nombre: ' ' }, { codigo: '' }, { categorias_id: '' }, { proveedores_id: '' }, { cantidad: 1.5 }, { stock_minimo: -1 }, { stock_minimo: NaN }]) assert.throws(() => productoBody({ ...form, ...change }));
});
test('Permisos de escritura permanecen restringidos', () => {
  for (const rol of ['Administrador', 'SuperAdmin', 'Mesero', 'Mesera', 'Bartender', 'Cajero']) {
    assert.equal(can({ rol }, 'productos.ver'), true);
    for (const permission of ['productos.crear', 'productos.editar', 'productos.eliminar']) assert.equal(can({ rol }, permission), ['Administrador','SuperAdmin'].includes(rol));
  }
});

test('Servicios con HTTP simulado y apiClient real', async t => {
  const previousFetch = globalThis.fetch, previousStorage = globalThis.localStorage;
  let token = 'token-prueba', unauthorized = 0;
  const requests = [];
  globalThis.localStorage = { getItem: () => token };
  const cleanup = configureUnauthorizedHandler(() => { unauthorized++; token = null; });
  const respond = (data, status = 200) => { globalThis.fetch = async (url, options) => {
    requests.push({ url, ...options });
    return new Response(JSON.stringify(data), { status });
  }; };
  try {
    await t.test('Productos y categorías envían Bearer automático', async () => {
      respond({ datos: [row] }); assert.equal((await listarProductos())[0].id, row.id);
      respond({ datos: [{ id: 28, nombre: 'Categoria real', descripcion: null, activo: 1 }] });
      assert.equal((await listarCategorias())[0].id, '28');
      assert.match(requests[0].url, /\/productos$/); assert.match(requests[1].url, /\/categorias$/);
      for (const r of requests) assert.equal(r.headers.get('Authorization'), 'Bearer token-prueba');
    });
    await t.test('Proveedor solo por lectura para selector', async () => {
      respond({ datos: [{ id: 'proveedor-real', contacto_nombre: 'Contacto', estado: 'activo' }] });
      assert.equal((await listarProveedores())[0].nombre, 'Contacto');
      assert.equal(requests.at(-1).method, 'GET');
    });
    await t.test('POST exitoso sin historial previo ni CPP manual', async () => {
      respond({ mensaje: 'Creado', id_producto: 'nuevo-id' }, 201);
      assert.equal((await crearProducto({ ...form, historial_costos_id: null })).id_producto, 'nuevo-id');
      const r = requests.at(-1), body = JSON.parse(r.body);
      assert.equal(r.method, 'POST'); assert.equal(body.cantidad, 3); assert.equal(body.precio_venta, 2844.44);
      assert.equal('costo_promedio' in body, false); assert.equal('estado' in body, false);
      assert.equal('historial_costos_id' in body, false);
    });
    await t.test('PUT exitoso sin cantidad ni costo', async () => {
      respond({ mensaje: 'Actualizado' }); await actualizarProducto(row.id, form);
      const r = requests.at(-1), body = JSON.parse(r.body);
      assert.equal(r.method, 'PUT'); assert.equal('cantidad' in body, false); assert.equal('costo_promedio' in body, false);
    });
    await t.test('DELETE usa endpoint real', async () => {
      respond({ mensaje: 'Eliminado' }); await eliminarProducto(row.id);
      assert.equal(requests.at(-1).method, 'DELETE');
    });
    await t.test('400 y 409 de negocio conservan mensaje', async () => {
      for (const status of [400, 409]) {
        respond({ error: 'Error de negocio' }, status);
        await assert.rejects(actualizarProducto(row.id, form), e => e.status === status && e.message === 'Error de negocio');
      }
    });
    await t.test('403 conserva sesión', async () => {
      respond({ error: 'No permitido' }, 403);
      await assert.rejects(listarProductos(), e => e.status === 403);
      assert.equal(token, 'token-prueba'); assert.equal(unauthorized, 0);
    });
    await t.test('401 utiliza callback global', async () => {
      respond({ error: 'Sesion vencida' }, 401);
      await assert.rejects(listarProductos(), e => e.status === 401);
      assert.equal(token, null); assert.equal(unauthorized, 1);
    });
    await t.test('HTTP exitoso con contrato inválido se rechaza', async () => {
      respond({ datos: 'incorrecto' }); await assert.rejects(listarProductos(), e => e.code === 'INVALID_RESPONSE');
      respond({ mensaje: 'Creado' }, 201); await assert.rejects(crearProducto(form), e => e.code === 'INVALID_RESPONSE');
    });
  } finally {
    cleanup(); globalThis.fetch = previousFetch;
    if (previousStorage === undefined) delete globalThis.localStorage; else globalThis.localStorage = previousStorage;
  }
});
