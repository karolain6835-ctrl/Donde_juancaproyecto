import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { createServer } from 'vite';
import { configureUnauthorizedHandler } from '../src/services/apiClient.js';
import { listarMesas, adaptMesas, cuentaMesa, trasladoBody, trasladarMesa, cambiarEstadoMesa } from '../src/services/mesasService.js';
import { pedidoBody, itemPedidoBody, listarPedidos, crearPedido, detallePedido, agregarItemPedido, cancelarItemPedido } from '../src/services/pedidosService.js';
import { adaptKanban, listarKanban, moverTarjeta, aceptarPedidoKanban, estadoPedidoKanban } from '../src/services/kanbanService.js';
import { listarResponsables } from '../src/services/usuariosService.js';
import { sincronizarOperacion } from '../src/services/operacionContract.js';
import { can } from '../src/utils/permissions.js';

const mesa = { id: 'mesa-real', numero: 7, estado: 'disponible' };
const product = { id: 'producto-real', nombre: 'Poker prueba 330ml', codigo: 'CERV-005', stock: 6, precio: 3500, costo: 2844.44 };
const pedido = { id: 'pedido-real', mesas_id: mesa.id, clientes_id: 'cliente-activo', usuarios_id: 'responsable-real', estado: 'abierto', creado_en: '2026-10-14T16:00:00Z', mesa_numero: 7, cliente_nombre: 'Cliente real', responsable_nombre: 'Responsable real', items: [{ id: 'item-real', cantidad_pedida: 2, precio_unitario: '3500.00', nombre: product.nombre, estado: 'preparando' }] };
const card = { id_item: 'item-real', id_pedido: pedido.id, mesa: 7, producto: product.nombre, cantidad: 2, hora: pedido.creado_en };
const board = { data: { enviado: [], preparacion: [card], servido: [] } };
const grouped = { pedido_id: pedido.id, mesa: 7, responsable: 'Responsable real', creado_en: pedido.creado_en, estado_derivado: 'preparando', items: [{ pedido_item_id: card.id_item, producto: product.nombre, cantidad_pedida: 2, estado: 'preparando' }] };
const cuenta = { mesa_id: mesa.id, resumen: { subtotal_productos: '7000.00', subtotal_juegos: '0.00', total_general: '7000.00' }, detalle_productos: [{ producto_id: product.id, nombre: product.nombre, cantidad_pedida: 2, precio_unitario: '3500.00', subtotal: '7000.00' }], detalle_juegos: [] };
const paginacion = { pagina: 1, limite: 20, total: 1, total_paginas: 1 };

test('Pedido conserva responsable asignado distinto del ejecutor y solo referencias legítimas', () => {
  assert.deepEqual(pedidoBody({ mesas_id: mesa.id, clientes_id: 'cliente-activo', usuarios_id: 'responsable-real', ejecutor: 'ejecutor-jwt' }), { mesas_id: mesa.id, clientes_id: 'cliente-activo', usuarios_id: 'responsable-real' });
  for (const field of ['mesas_id', 'clientes_id', 'usuarios_id']) assert.throws(() => pedidoBody({ mesas_id: mesa.id, clientes_id: 'cliente-activo', usuarios_id: 'responsable-real', [field]: '' }));
});
test('Ítem usa producto real, stock actual y precio de catálogo sin actor ni precio manual', () => {
  assert.deepEqual(itemPedidoBody({ productos_id: product.id, cantidad_pedida: '2', precio_unitario: 1, usuarios_id: 'intruso' }, [product]), { productos_id: product.id, cantidad_pedida: 2, precio_unitario: 3500 });
  assert.equal(itemPedidoBody({ productos_id: product.id, cantidad_pedida: 1 }, [{ ...product, precio: 2844.44 }]).precio_unitario, 2844.44);
  for (const cantidad_pedida of ['', 0, -1, 0.5, 7, null, 2147483648]) assert.throws(() => itemPedidoBody({ productos_id: product.id, cantidad_pedida }, [product]));
  assert.throws(() => itemPedidoBody({ productos_id: 'inexistente', cantidad_pedida: 1 }, [product]));
});
test('Mesas usa estados existentes y traslado entre IDs reales diferentes', () => {
  assert.equal(adaptMesas({ datos: [{ ...mesa, estado: 'en_cobro' }] })[0].estado, 'en_cobro');
  assert.throws(() => adaptMesas({ datos: [{ ...mesa, estado: 'por-cobrar' }] }));
  assert.deepEqual(trasladoBody({ mesa_origen_id: mesa.id, mesa_destino_id: 'destino-real', usuarios_id: 'intruso' }), { mesa_origen_id: mesa.id, mesa_destino_id: 'destino-real' });
  assert.throws(() => trasladoBody({ mesa_origen_id: mesa.id, mesa_destino_id: mesa.id.toUpperCase() }));
});
test('Kanban adapta columna preparacion a preparando sin inventar estados ni campos', () => {
  assert.deepEqual(adaptKanban(board), [{ ...card, estado: 'preparando' }]);
  assert.deepEqual(adaptKanban({ data: { enviado: [], preparacion: [], servido: [] } }), []);
  assert.throws(() => adaptKanban({ pedidos: [] }));
});
test('Semántica agrupada: enviado, preparando, parcial y servido excluyendo cancelados', () => {
  const state = (...estados) => estadoPedidoKanban(estados.map(estado => ({ estado })));
  assert.equal(state('enviado', 'enviado'), 'enviado');
  assert.equal(state('preparando', 'enviado'), 'preparando');
  assert.equal(state('preparando', 'servido'), 'parcialmente_servido');
  assert.equal(state('enviado', 'servido'), 'parcialmente_servido');
  assert.equal(state('servido', 'servido'), 'servido');
  assert.equal(state('servido', 'cancelado'), 'servido');
  assert.equal(state('cancelado'), null);
});
test('No hay stock/estado optimista; reconsultas solo después de la respuesta confirmada', async () => {
  const snapshots = { productos: [structuredClone(product)], pedido: structuredClone(pedido), tarjeta: structuredClone(card) }, before = structuredClone(snapshots);
  const events = [];
  let confirm;
  const pending = sincronizarOperacion(() => new Promise(resolve => { confirm = resolve; }), ['pedidos', 'detalle', 'productos', 'mesas', 'movimientos', 'kanban'].map(name => async () => events.push(name)));
  assert.deepEqual(snapshots, before); assert.deepEqual(events, []);
  confirm({ id_item: card.id_item }); await pending;
  assert.deepEqual(events, ['pedidos', 'detalle', 'productos', 'mesas', 'movimientos', 'kanban']); assert.deepEqual(snapshots, before);
});
test('Errores 400/404/409 conservan snapshots y no ejecutan reconsulta de éxito', async () => {
  for (const status of [400, 404, 409]) {
    const before = structuredClone(product); let refresh = 0;
    await assert.rejects(sincronizarOperacion(async () => { throw Object.assign(new Error('Mensaje real'), { status }); }, [async () => refresh++]), { status });
    assert.equal(refresh, 0); assert.deepEqual(product, before);
  }
});
test('Matriz de permisos de mesas, pedidos, cancelación y Kanban permanece intacta', () => {
  for (const rol of ['Administrador', 'SuperAdmin', 'Mesero', 'Mesera', 'Cajero', 'Bartender']) {
    const admin = ['Administrador', 'SuperAdmin'].includes(rol), service = admin || ['Mesero', 'Mesera'].includes(rol), cash = admin || rol === 'Cajero';
    for (const permission of ['mesas.ver', 'mesas.cuenta', 'pedidos.ver']) assert.equal(can({ rol }, permission), service || cash);
    for (const permission of ['mesas.trasladar', 'pedidos.crear', 'pedidos.agregarItems']) assert.equal(can({ rol }, permission), service);
    for (const permission of ['mesas.cambiarEstado', 'pedidos.cancelarItem']) assert.equal(can({ rol }, permission), cash);
    for (const permission of ['kanban.ver', 'kanban.actualizar']) assert.equal(can({ rol }, permission), service || rol === 'Bartender');
  }
});
test('HTTP de operación usa apiClient, JWT y contratos auditados', async t => {
  const originalFetch = globalThis.fetch, originalStorage = globalThis.localStorage;
  globalThis.localStorage = { getItem: () => 'jwt-ejecutor-real' };
  let response, status = 200, current; const requests = [];
  globalThis.fetch = async (url, options) => {
    current = { url, ...options }; requests.push(current);
    return new Response(JSON.stringify(typeof response === 'function' ? response(url) : response), { status });
  };
  let unauthorized = 0; const cleanup = configureUnauthorizedHandler(() => unauthorized++);
  try {
    await t.test('listado mesas combina únicamente tres estados reales', async () => {
      response = url => ({ datos: [{ ...mesa, id: url.split('/').at(-1), estado: url.split('/').at(-1) }] });
      assert.equal((await listarMesas()).length, 3);
      assert.deepEqual(requests.slice(-3).map(r => new URL(r.url).pathname.split('/').at(-1)), ['disponible', 'ocupada', 'en_cobro']);
      assert.equal(current.headers.get('Authorization'), 'Bearer jwt-ejecutor-real');
    });
    await t.test('cuenta de mesa respeta data y resumen del backend', async () => {
      response = { data: cuenta }; assert.deepEqual(await cuentaMesa(mesa.id), cuenta); assert.ok(current.url.endsWith(`/mesas/${mesa.id}/cuenta`));
    });
    await t.test('cambio manual PATCH estado sin actor', async () => {
      response = { mensaje: 'Confirmado' }; await cambiarEstadoMesa(mesa.id, 'en_cobro');
      assert.equal(current.method, 'PATCH'); assert.deepEqual(JSON.parse(current.body), { estado: 'en_cobro' });
    });
    await t.test('traslado POST con origen/destino sin actor', async () => {
      response = { exito: true }; await trasladarMesa({ mesa_origen_id: mesa.id, mesa_destino_id: 'destino-real' });
      assert.ok(current.url.endsWith('/mesas/traslado')); assert.equal(current.method, 'POST'); assert.deepEqual(JSON.parse(current.body), { mesa_origen_id: mesa.id, mesa_destino_id: 'destino-real' });
    });
    await t.test('responsables consulta lectura mínima de usuarios reales', async () => {
      response = { datos: [{ id: 'responsable-real', nombre: 'Responsable real', estado: 'activo' }] };
      assert.equal((await listarResponsables())[0].id, 'responsable-real'); assert.ok(current.url.endsWith('/usuarios/responsables'));
    });
    await t.test('listado pedidos permite mesa, estado y paginación', async () => {
      response = { datos: [pedido], paginacion }; assert.equal((await listarPedidos({ mesas_id: mesa.id, estado: 'abierto', pagina: 2 })).datos[0].id, pedido.id);
      const url = new URL(current.url); assert.equal(url.searchParams.get('mesas_id'), mesa.id); assert.equal(url.searchParams.get('estado'), 'abierto'); assert.equal(url.searchParams.get('pagina'), '2');
    });
    await t.test('crear POST 201 conserva usuarios_id seleccionado', async () => {
      status = 201; response = { id_pedido: pedido.id };
      assert.equal((await crearPedido(pedido)).id_pedido, pedido.id);
      assert.equal(current.method, 'POST'); assert.deepEqual(JSON.parse(current.body), { mesas_id: mesa.id, usuarios_id: 'responsable-real', clientes_id: 'cliente-activo' });
    });
    await t.test('detalle conserva cantidades/precios sin fabricar total', async () => {
      status = 200; response = { datos: pedido }; assert.deepEqual(await detallePedido(pedido.id), pedido); assert.equal(Object.hasOwn(await detallePedido(pedido.id), 'total'), false);
    });
    await t.test('agregar ítem POST 201 sin ejecutor manual', async () => {
      status = 201; response = { id_item: card.id_item, stock_restante: 4 };
      const before = structuredClone(product); await agregarItemPedido(pedido.id, { productos_id: product.id, cantidad_pedida: '2' }, [product]);
      assert.deepEqual(JSON.parse(current.body), { productos_id: product.id, cantidad_pedida: 2, precio_unitario: 3500 }); assert.deepEqual(product, before);
    });
    await t.test('cancelación PUT sin body ni actor', async () => {
      status = 200; response = { exito: true, id_item: card.id_item }; await cancelarItemPedido(card.id_item);
      assert.ok(current.url.endsWith('/pedidos/items/item-real/cancelar')); assert.equal(current.method, 'PUT'); assert.equal(current.body, undefined);
    });
    await t.test('tablero usa /tablero y excluye /simulado', async () => {
      response = board; assert.equal((await listarKanban())[0].estado, 'preparando'); assert.ok(current.url.endsWith('/kanban/tablero'));
    });
    await t.test('aceptar pedido usa PATCH por pedido sin body ni actor', async () => {
      response = { pedido_id: pedido.id, items_aceptados: 2 };
      assert.equal((await aceptarPedidoKanban(pedido.id)).items_aceptados, 2);
      assert.ok(current.url.endsWith('/kanban/pedidos/pedido-real/aceptar'));
      assert.equal(current.method, 'PATCH'); assert.equal(current.body, undefined);
    });
    await t.test('movimiento PUT persiste enviado → preparando → servido sin actor', async () => {
      for (const [from, to] of [['enviado', 'preparando'], ['preparando', 'servido']]) {
        response = { estado_actual: to, tarjeta: { ...card, estado_item: to } }; await moverTarjeta({ ...card, estado: from }, to);
        assert.equal(current.method, 'PUT'); assert.deepEqual(JSON.parse(current.body), { nuevo_estado: to });
      }
    });
    await t.test('transiciones inválidas no llegan a HTTP', async () => {
      const count = requests.length;
      await assert.rejects(moverTarjeta({ ...card, estado: 'enviado' }, 'servido'));
      await assert.rejects(moverTarjeta({ ...card, estado: 'servido' }, 'preparando'));
      assert.equal(requests.length, count);
    });
    for (const code of [400, 401, 403, 404, 409, 500]) await t.test(`propaga ${code} y mensaje real`, async () => {
      status = code; response = { error: code === 409 ? 'No puede asociarse un pedido a un cliente inactivo.' : `Mensaje real ${code}` };
      await assert.rejects(crearPedido(pedido), e => e.status === code && e.message === response.error);
    });
    assert.equal(unauthorized, 1);
  } finally { globalThis.fetch = originalFetch; globalThis.localStorage = originalStorage; cleanup(); }
});

test('Componentes reales de operación: recursos, formularios y controles por permiso', async t => {
  const server = await createServer({ root: fileURLToPath(new URL('..', import.meta.url)), server: { middlewareMode: true }, appType: 'custom', plugins: [{
    name: 'operacion-test-resources', enforce: 'pre', transform(source, filename) {
      if (filename.replaceAll('\\', '/').endsWith('/hooks/useRemoteCatalog.js')) return source.replace('export function useRemoteCatalog(loader) {', 'export function useRemoteCatalog(loader) { if (loader.toString().includes("listarParticipantesMesa")) return {data:{sesion:null,datos:[]}}; if (loader.toString().includes("listarClientes") && globalThis.__detalleRondasTest) return {data:{datos:[],total:0,limite:20}}; if (globalThis.__operacionResources) return globalThis.__operacionResources.shift() || { data: { sesion: null, datos: [] } };');
    },
  }] });
  try {
    const modules = await Promise.all(['MesasPage', 'PedidosPage', 'KanbanPage'].map(name => server.ssrLoadModule(`/src/pages/${name}.jsx`)));
    const { default: Form } = await server.ssrLoadModule('/src/components/PedidoForm.jsx');
    const { default: Detail } = await server.ssrLoadModule('/src/components/PedidoDetalle.jsx');
    const { default: MesaDetail } = await server.ssrLoadModule('/src/components/MesaDetalle.jsx');
    const { AuthContext } = await server.ssrLoadModule('/src/context/useAuth.js');
    const render = (Component, resources, props = {}, rol = 'Administrador') => {
      globalThis.__detalleRondasTest = Component === Detail;
      globalThis.__operacionResources = Component === Form ? [...resources].reverse() : Component === Detail ? [resources[0], resources[1] || { data: [] }, { data: [] }] : resources;
      return renderToString(React.createElement(MemoryRouter, null, React.createElement(AuthContext.Provider, { value: { user: { id: 'ejecutor-real', rol } } }, React.createElement(Component, props))));
    };
    for (const [index, name] of ['Mesas', 'Pedidos', 'Kanban'].entries()) {
      const Component = modules[index].default;
      const extras = index === 1 ? [{ data: [mesa] }, { data: [product] }] : [];
      await t.test(`${name}: loading/error/vacío`, () => {
        assert.match(render(Component, [{ loading: true }, ...extras]), /Cargando/);
        const html = render(Component, [{ error: 'Error de servidor' }, ...extras]); assert.match(html, /Error de servidor/); assert.match(html, /Reintentar/);
        const empty = index === 1 ? { datos: [], paginacion: { ...paginacion, total: 0 } } : [];
        assert.match(render(Component, [{ data: empty }, ...extras]), /No hay/);
      });
    }
    await t.test('mesas muestra número y estado reales', () => {
      assert.match(render(modules[0].default, [{ data: [{ ...mesa, estado: 'en_cobro' }] }]), /Mesa <!-- -->7/);
      assert.match(render(modules[0].default, [{ data: [{ ...mesa, estado: 'en_cobro' }] }]), /En cobro/);
    });
    await t.test('pedidos muestra cliente/responsable reales sin total inventado', () => {
      const html = render(modules[1].default, [{ data: { datos: [pedido], paginacion } }, { data: [mesa] }, { data: [product] }]);
      assert.match(html, /Cliente real/); assert.match(html, /Responsable real/); assert.doesNotMatch(html, /P-384|86\.000|retrasado/);
    });
    await t.test('formulario solo ofrece clientes activos y responsables reales distintos del ejecutor', () => {
      const html = render(Form, [{ data: { datos: [{ id: 'cliente-activo', nombre: 'Cliente real', estado: 'activo' }, { id: 'cliente-inactivo', nombre: 'Cliente inactivo', estado: 'inactivo' }], pagina: 1, limite: 20, total: 1 } }, { data: [{ id: 'responsable-real', nombre: 'Responsable real', estado: 'activo' }] }], { mesas: { data: [mesa] }, initialMesa: mesa.id });
      assert.match(html, /aria-label="Seleccionar a Cliente real"/); assert.doesNotMatch(html, /Cliente inactivo/); assert.match(html, /value="responsable-real"/); assert.match(html, /Responsable del pedido/); assert.match(html, /value="mesa-real" selected=""/);
      assert.match(html, /pedido-create-assignment/); assert.match(html, /<footer class="pedido-create-footer">/); assert.match(html, /type="button">Cancelar/);
    });
    await t.test('detalle muestra ítems reales y cancelación exclusivamente a roles autorizados', () => {
      const props = { id: pedido.id, summary: pedido, mesas: { data: [mesa] }, productos: { data: [product] } };
      const admin = render(Detail, [{ data: pedido }], props);
      assert.match(admin, /Poker prueba 330ml/); assert.match(admin, /3\.500/); assert.match(admin, /Agregar producto/); assert.match(admin, /Cancelar producto/);
      const service = render(Detail, [{ data: pedido }], props, 'Mesero'); assert.match(service, /Agregar producto/); assert.doesNotMatch(service, /Cancelar producto/);
      const cash = render(Detail, [{ data: pedido }], props, 'Cajero'); assert.doesNotMatch(cash, /Agregar producto/); assert.match(cash, /Cancelar producto/);
    });
    await t.test('detalle reconsultado muestra una sola línea con cantidad acumulada devuelta por backend', () => {
      const accumulated = { ...pedido, items: [{ ...pedido.items[0], cantidad_pedida: 4 }] };
      const html = render(Detail, [{ data: accumulated }], { id: pedido.id, summary: pedido, mesas: { data: [mesa] }, productos: { data: [product] } });
      assert.equal(html.split('class="operacion-item pedido-detail-line"').length - 1, 1);
      assert.match(html, /data-label="Cantidad">4/);
    });
    await t.test('detalle distingue personas por línea y ofrece participantes reales al agregar', () => {
      const persons = [{ id: 'persona-carlos', nombre: 'Carlos', tipo_participante: 'registrado' }, { id: 'persona-laura', nombre: 'Laura', tipo_participante: 'temporal' }];
      const identified = { ...pedido, clientes_id: null, items: persons.map((p, i) => ({ ...pedido.items[0], id: `linea-${i}`, participante_id: p.id, participante_nombre: p.nombre })) };
      const html = render(Detail, [{ data: identified }, { data: persons }], { id: pedido.id, summary: { ...pedido, clientes_id: null, cliente_nombre: null }, mesas: { data: [mesa] }, productos: { data: [product] } });
      assert.match(html, /Sin cliente registrado/);
      assert.match(html, /value="persona-carlos"/); assert.match(html, /value="persona-laura"/);
      assert.match(html, /class="pedido-line-person"[^>]*>Carlos/); assert.match(html, /class="pedido-line-person"[^>]*>Laura/);
      assert.equal(html.split('class="operacion-item pedido-detail-line"').length - 1, 2);
    });
    await t.test('detalle presenta centavos históricos exactos y excluye cancelados del total de productos', () => {
      const data = { ...pedido, items: [{ ...pedido.items[0], precio_unitario: '2844.44', cantidad_pedida: 3 }, { ...pedido.items[0], id: 'cancelado', precio_unitario: '9000.00', cantidad_pedida: 1, estado: 'cancelado' }] };
      const html = render(Detail, [{ data }], { id: pedido.id, summary: pedido, mesas: { data: [mesa] }, productos: { data: [product] } });
      assert.match(html, /role="table" aria-label="Productos del pedido"/);
      assert.match(html, /Total productos<\/strong><strong>\$\s*8\.533,32/);
      assert.match(html, /Sin imagen de Poker prueba 330ml/);
      assert.equal((html.match(/>Cancelar producto<\/button>/g)||[]).length, 1);
    });
    await t.test('cuenta de mesa usa total del servidor y permisos de traslado/estado', () => {
      const props = { id: mesa.id, mesas: { data: [mesa, { id: 'destino-real', numero: 8, estado: 'disponible' }] } };
      const resources = () => [{ data: cuenta }, { data: { datos: [pedido], paginacion } }, { data: { puede_liberarse: false, motivo: 'Tiene pedidos abiertos.' } }];
      const service = render(MesaDetail, resources(), props, 'Mesero'); assert.match(service, /7\.000/); assert.match(service, /Trasladar cuenta/); assert.doesNotMatch(service, /Guardar estado/);
      const cash = render(MesaDetail, resources(), props, 'Cajero'); assert.doesNotMatch(cash, /Trasladar cuenta/); assert.match(cash, /Guardar estado/);
    });
    await t.test('Kanban muestra cantidad y transición persistible sin áreas/tiempos ficticios', () => {
      const html = render(modules[2].default, [{ data: [grouped] }], {}, 'Bartender');
      assert.match(html, /Poker prueba 330ml/); assert.match(html, /Despachar todo/); assert.doesNotMatch(html, /Ver pedido|Laura|Carlos|Cocina|25 min/);
    });
    await t.test('Bartender puede aceptar el pedido desde Enviado sin ofrecer despacho directo', () => {
      const html = render(modules[2].default, [{ data: [{ ...grouped, estado_derivado: 'enviado', items: [{ ...grouped.items[0], estado: 'enviado' }] }] }], {}, 'Bartender');
      assert.match(html, /Aceptar pedido/); assert.doesNotMatch(html, /Marcar servido/);
    });
    await t.test('Cajero no obtiene Kanban y Bartender no obtiene pedidos/mesas', () => {
      assert.match(render(modules[2].default, [{ data: [] }], {}, 'Cajero'), /No tienes permiso/);
      assert.match(render(modules[1].default, [{ data: null }, { data: null }, { data: null }], {}, 'Bartender'), /No tienes permiso/);
      assert.match(render(modules[0].default, [{ data: null }], {}, 'Bartender'), /No tienes permiso/);
    });
  } finally { delete globalThis.__operacionResources; delete globalThis.__detalleRondasTest; await server.close(); }
});
test('Guardado compartido impide doble clic antes de completar la petición', async () => {
  const server = await createServer({ root: fileURLToPath(new URL('..', import.meta.url)), server: { middlewareMode: true }, appType: 'custom' });
  try {
    const { useCatalogMutation } = await server.ssrLoadModule('/src/hooks/useRemoteCatalog.js');
    let mutation;
    function Harness() { mutation = useCatalogMutation(); return null; }
    renderToString(React.createElement(Harness));
    let resolve, calls = 0;
    const operation = () => { calls++; return new Promise(done => { resolve = done; }); };
    const first = mutation.run(operation, async () => {}, 'Confirmado');
    await mutation.run(operation, async () => {}, 'Confirmado');
    assert.equal(calls, 1); resolve(); await first;
  } finally { await server.close(); }
});
test('Módulos de esta fase no conservan mocks, fetch directo ni actores manuales en stock/Kanban', async () => {
  for (const file of ['MesasPage', 'PedidosPage', 'KanbanPage']) {
    const source = await readFile(new URL(`../src/pages/${file}.jsx`, import.meta.url), 'utf8');
    assert.doesNotMatch(source, /P-\d|fetch\(|localhost:5000|Laura|Hamburguesa especial|setItems\(/);
  }
  const kanban = await readFile(new URL('../src/services/kanbanService.js', import.meta.url), 'utf8'); assert.doesNotMatch(kanban, /usuarios_id|simulado/);
});
