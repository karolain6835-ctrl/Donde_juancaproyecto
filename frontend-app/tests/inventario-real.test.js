import test from 'node:test';
import assert from 'node:assert/strict';
import { adaptMovimientos, listarMovimientos, ajusteBody, ajustarStock, stockMutation } from '../src/services/inventarioService.js';
import { adaptMermas, listarMotivos, listarRefrigeradoresMerma, mermaBody, registrarMerma } from '../src/services/mermasService.js';
import { adaptAlertas, alertActions, listarAlertas, detalleAlerta, actuarAlerta } from '../src/services/alertasInventarioService.js';
import { configureUnauthorizedHandler } from '../src/services/apiClient.js';
import { can } from '../src/utils/permissions.js';

const pagination = { pagina: 1, limite: 20, total: 1, total_paginas: 1 };
const movimiento = { id: 'mov-real', tipo: 'ajuste', cantidad: -2, stock_antes: 10, stock_despues: 8, producto_nombre: 'Producto real', productos_id: 'p1', usuario_nombre: 'Actor real', creado_en: '2026-10-14T15:00:00Z', referencia_tipo: 'ajuste', referencia_id: null };
const merma = { id: 'merma-real', cantidad: 2, valor_economico: '5688.88', producto_nombre: 'Producto real', creado_en: '2026-10-14T15:00:00Z' };
const alerta = { id: 'episodio-real', productos_id: 'p1', producto: 'Producto real', stock_actual: 1, stock_minimo: 5, tipo: 'bajo', estado: 'activa', creado_en: '2026-10-14T15:00:00Z', actualizado_en: '2026-10-14T15:00:00Z', resuelto_en: null };

test('Adapta movimientos, mermas y episodios sin inventar referencias', () => {
  assert.equal(adaptMovimientos({ datos: [movimiento], paginacion: pagination }).datos[0].cantidad, -2);
  assert.equal(adaptMermas({ datos: [merma], paginacion: pagination }).datos[0].valor_economico, '5688.88');
  assert.equal(adaptAlertas({ alertas: [alerta], total_alertas: 1, paginacion: pagination }).datos[0].id, 'episodio-real');
});
test('Contratos inesperados se rechazan, vacíos válidos se conservan', () => {
  for (const bad of [null, {}, { datos: {} }, { datos: [], paginacion: {} }]) {
    assert.throws(() => adaptMovimientos(bad), e => e.code === 'INVALID_RESPONSE');
    assert.throws(() => adaptMermas(bad), e => e.code === 'INVALID_RESPONSE');
    assert.throws(() => adaptAlertas(bad), e => e.code === 'INVALID_RESPONSE');
  }
  assert.deepEqual(adaptMovimientos({ datos: [], paginacion: { ...pagination, total: 0, total_paginas: 0 } }).datos, []);
});
test('Ajuste usa producto y cantidad entera sin actor', () => {
  assert.deepEqual(ajusteBody({ producto_id: 'p1', nueva_cantidad: '0', usuarios_id: 'intruso' }), { producto_id: 'p1', nueva_cantidad: 0 });
  for (const value of ['', ' ', -1, 1.5, NaN, Infinity, null, 2147483648]) assert.throws(() => ajusteBody({ producto_id: 'p1', nueva_cantidad: value }), e => e.code === 'VALIDATION_ERROR');
});
test('Merma exige referencias reales y excluye actor y observación no soportada', () => {
  assert.deepEqual(mermaBody({ productos_id: 'p1', cantidad: '2', merma_motivos_id: 'motivo-real', refrigeradores_id: 'r1', usuarios_id: 'intruso', observacion: 'No admitida' }), { productos_id: 'p1', cantidad: 2, merma_motivos_id: 'motivo-real', refrigeradores_id: 'r1' });
  for (const value of [0, -1, 1.5, '', null]) assert.throws(() => mermaBody({ productos_id: 'p1', cantidad: value, merma_motivos_id: 'm1', refrigeradores_id: 'r1' }));
});
test('Éxito reconsulta productos, movimientos, mermas y alertas después de persistir', async () => {
  const order = [];
  const refresh = () => Promise.all(['productos','movimientos','mermas','alertas'].map(async name => order.push(name)));
  const response = await stockMutation(async () => { order.push('persistido'); return { ok: true }; }, refresh);
  assert.deepEqual(order, ['persistido','productos','movimientos','mermas','alertas']); assert.equal(response.ok, true);
});
test('Error de mutación no modifica stock local ni ejecuta sincronización de éxito', async () => {
  const products = [{ id: 'p1', stock: 10 }], before = structuredClone(products);
  let refresh = 0;
  await assert.rejects(stockMutation(async () => { throw new Error('Rechazada'); }, async () => { refresh++; }));
  assert.equal(refresh, 0); assert.deepEqual(products, before);
});
test('Transiciones visuales coinciden con estados del backend', () => {
  assert.deepEqual(alertActions.activa, ['vista','silenciar','resolver']);
  assert.deepEqual(alertActions.vista, ['silenciar','resolver']);
  assert.deepEqual(alertActions.silenciada, ['reactivar','resolver']);
  assert.deepEqual(alertActions.resuelta, []);
});
test('Permisos de inventario: Cajero excluido de alertas y Bartender solo lectura de mermas', () => {
  for (const role of ['Administrador','SuperAdmin','Mesero','Mesera','Bartender','Cajero']) {
    const user = { rol: role }, admin = ['Administrador','SuperAdmin'].includes(role);
    assert.equal(can(user, 'inventario.ajustar'), admin);
    assert.equal(can(user, 'inventario.movimientos'), admin);
    assert.equal(can(user, 'mermas.registrar'), admin);
    assert.equal(can(user, 'mermas.ver'), admin || role === 'Bartender');
    assert.equal(can(user, 'alertas.ver'), role !== 'Cajero');
  }
});

test('Inventario HTTP simulado usa apiClient y conserva errores del servidor', async t => {
  const oldFetch = globalThis.fetch, oldStorage = globalThis.localStorage;
  let token = 'token-inventario', logouts = 0;
  const calls = [];
  globalThis.localStorage = { getItem: () => token };
  const cleanup = configureUnauthorizedHandler(() => { token = null; logouts++; });
  const respond = (body, status = 200) => { globalThis.fetch = async (url, options) => {
    calls.push({ url, ...options }); return new Response(JSON.stringify(body), { status });
  }; };
  try {
    await t.test('Listado movimientos con filtro y paginación', async () => {
      respond({ datos: [movimiento], paginacion: pagination });
      await listarMovimientos({ tipo: 'merma', producto_id: 'p1', pagina: 2 });
      assert.equal(new URL(calls.at(-1).url).searchParams.get('tipo'), 'merma');
      assert.equal(new URL(calls.at(-1).url).searchParams.get('pagina'), '2');
      assert.equal(calls.at(-1).headers.get('Authorization'), 'Bearer token-inventario');
    });
    await t.test('Ajuste correcto sin actor', async () => {
      respond({ mensaje: 'Actualizado', stock_anterior: 10, stock_actual: 8, diferencia: -2 });
      await ajustarStock({ producto_id: 'p1', nueva_cantidad: '8', usuarios_id: 'intruso' });
      assert.equal(calls.at(-1).method, 'PUT'); assert.deepEqual(JSON.parse(calls.at(-1).body), { producto_id: 'p1', nueva_cantidad: 8 });
    });
    await t.test('Motivos y refrigeradores proceden de lectura real', async () => {
      respond({ datos: [{ id: 'motivo-real', nombre: 'Rotura' }] }); assert.equal((await listarMotivos())[0].id, 'motivo-real'); assert.match(calls.at(-1).url, /\/mermas\/motivos$/);
      respond({ datos: [{ id: 'r1', nombre: 'Barra', estado: 'activa' }, { id: 'r2', nombre: 'Cocina', estado: 'apagada' }] });
      assert.equal((await listarRefrigeradoresMerma()).filter(r => r.estado === 'activa').length, 1); assert.match(calls.at(-1).url, /\/mermas\/refrigeradores$/);
    });
    await t.test('Registro merma sin actor ni valor económico manual', async () => {
      respond({ datos: { id: 'merma-real', stock_actual: 8 } }, 201);
      await registrarMerma({ productos_id: 'p1', cantidad: '2', merma_motivos_id: 'm1', refrigeradores_id: 'r1', usuarios_id: 'otro', valor_economico: 999 });
      assert.equal(calls.at(-1).method, 'POST'); assert.deepEqual(Object.keys(JSON.parse(calls.at(-1).body)).sort(), ['productos_id','cantidad','merma_motivos_id','refrigeradores_id'].sort());
    });
    await t.test('Alertas usa abiertas por defecto y estado explícito para resueltas', async () => {
      respond({ alertas: [alerta], total_alertas: 1, paginacion: pagination }); await listarAlertas();
      assert.equal(new URL(calls.at(-1).url).searchParams.has('estado'), false);
      await listarAlertas({ estado: 'resuelta' }); assert.equal(new URL(calls.at(-1).url).searchParams.get('estado'), 'resuelta');
    });
    await t.test('Detalle e historial se consultan al servidor', async () => {
      respond({ alerta: { ...alerta, historial: [] } }); assert.equal((await detalleAlerta(alerta.id)).id, alerta.id);
    });
    for (const action of ['vista','silenciar','reactivar','resolver']) await t.test(`PATCH ${action} sin body ni actor`, async () => {
      respond({ alerta: { ...alerta, historial: [] } }); await actuarAlerta(alerta.id, action);
      assert.equal(calls.at(-1).method, 'PATCH'); assert.equal(calls.at(-1).body, undefined); assert.ok(calls.at(-1).url.endsWith('/' + action));
    });
    await t.test('Resolver con stock bajo conserva estado y mensaje 409', async () => {
      const before = structuredClone(alerta); respond({ error: 'No se puede resolver mientras persista la condicion de alerta.' }, 409);
      await assert.rejects(actuarAlerta(alerta.id, 'resolver'), e => e.status === 409 && /persista/.test(e.message)); assert.deepEqual(alerta, before);
    });
    for (const status of [400,403,409]) await t.test(`Ajuste propaga ${status}`, async () => {
      respond({ error: 'Error del servidor' }, status);
      await assert.rejects(ajustarStock({ producto_id: 'p1', nueva_cantidad: 1 }), e => e.status === status && e.message === 'Error del servidor');
      assert.equal(token, 'token-inventario'); assert.equal(logouts, 0);
    });
    await t.test('401 usa manejo global existente', async () => {
      respond({ error: 'Sesión vencida' }, 401); await assert.rejects(listarAlertas(), e => e.status === 401); assert.equal(logouts, 1); assert.equal(token, null);
    });
  } finally {
    cleanup(); globalThis.fetch = oldFetch;
    if (oldStorage === undefined) delete globalThis.localStorage; else globalThis.localStorage = oldStorage;
  }
});
