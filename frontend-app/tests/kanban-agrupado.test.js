import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { createServer } from 'vite';
import { fileURLToPath } from 'node:url';
import { listarPedidosKanban, aceptarPedidoKanban, despacharTodoPedido, moverTarjeta } from '../src/services/kanbanService.js';
import { can } from '../src/utils/permissions.js';

const pedido = { pedido_id: 'p', mesa: 4, responsable: 'Lina', responsable_id: 'u1', creado_en: '2026-10-14T16:00:00Z', estado_derivado: 'parcialmente_servido', items: [
  { pedido_item_id: 'i1', producto: 'Poker', cantidad_pedida: 2, estado: 'preparando' },
  { pedido_item_id: 'i2', producto: 'Aguila', cantidad_pedida: 3, estado: 'servido' },
] };
test('Servicio agrupado usa lectura por pedido y una petición para despachar todo', async () => {
  const original = globalThis.fetch; let response, status = 200, request;
  globalThis.fetch = async (url, options) => { request = { url, ...options }; return new Response(JSON.stringify(response), { status }); };
  try {
    response = { datos: [pedido] }; assert.deepEqual(await listarPedidosKanban(), [pedido]); assert.ok(request.url.endsWith('/kanban/pedidos'));
    response = { pedido_id: 'p', items_aceptados: 2 }; await aceptarPedidoKanban('p'); assert.equal(request.method, 'PATCH'); assert.equal(request.body, undefined);
    response = { pedido_id: 'p', items_despachados: 2 }; await despacharTodoPedido('p'); assert.ok(request.url.endsWith('/kanban/pedidos/p/despachar-todo')); assert.equal(request.method, 'PATCH');
    response = { estado_actual: 'servido', tarjeta: { id_item: 'i1' } }; await moverTarjeta({ id_item: 'i1', estado: 'preparando' }, 'servido'); assert.deepEqual(JSON.parse(request.body), { nuevo_estado: 'servido' });
    for (const code of [403, 409]) {
      status = code; response = { error: `Mensaje real ${code}` }; await assert.rejects(despacharTodoPedido('p'), error => error.status === code && error.message === response.error);
    }
  } finally { globalThis.fetch = original; }
});
test('Kanban: tarjeta única, múltiples líneas, parcial y acciones válidas en detalle', async t => {
  const server = await createServer({ root: fileURLToPath(new URL('..', import.meta.url)), server: { middlewareMode: true }, appType: 'custom', plugins: [{
    name: 'grouped-ui-fixtures', enforce: 'pre', transform(source, filename) {
      if (filename.replaceAll('\\', '/').endsWith('/hooks/useRemoteCatalog.js')) return source.replace('export function useRemoteCatalog(loader) {', 'export function useRemoteCatalog(loader) { return globalThis.__groupResources.shift();').replace('export function useCatalogMutation() {', 'export function useCatalogMutation() { if (globalThis.__groupMutationError) return { busy: false, error: globalThis.__groupMutationError, success: "" };');
      if (filename.replaceAll('\\', '/').endsWith('/pages/KanbanPage.jsx')) return source.replace('useState(null);', 'useState(globalThis.__groupSelected || null);');
    },
  }] });
  try {
    const { default: Page } = await server.ssrLoadModule('/src/pages/KanbanPage.jsx');
    const { default: Form } = await server.ssrLoadModule('/src/components/PedidoForm.jsx');
    const { AuthContext } = await server.ssrLoadModule('/src/context/useAuth.js');
    const render = (Component, rol, props = {}) => renderToString(React.createElement(MemoryRouter, null, React.createElement(AuthContext.Provider, { value: { user: { id: 'u1', nombre: 'Lina Marcela', rol } } }, React.createElement(Component, props))));
    await t.test('una tarjeta con varias líneas y estado parcial', () => {
      globalThis.__groupResources = [{ data: [pedido] }];
      const html = render(Page, 'Bartender'); assert.equal(html.split('class="kanban-card"').length - 1, 1); assert.match(html, /Poker/); assert.match(html, /Aguila/); assert.match(html, /Parcialmente servido/); assert.match(html, /Despachar todo/);
    });
    await t.test('detalle sirve líneas completas y muestra todas las líneas', () => {
      globalThis.__groupSelected = 'p'; globalThis.__groupResources = [{ data: [pedido] }];
      const html = render(Page, 'Bartender'); assert.match(html, /role="dialog"/); assert.equal(html.split('Marcar línea servida').length - 1, 1); assert.match(html, /Despachar todo/); delete globalThis.__groupSelected;
    });
    await t.test('enviado ofrece aceptar y oculta despacho directo', () => {
      globalThis.__groupResources = [{ data: [{ ...pedido, estado_derivado: 'enviado', items: pedido.items.map(i => ({ ...i, estado: 'enviado' })) }] }];
      const html = render(Page, 'Bartender'); assert.match(html, /Aceptar pedido/); assert.doesNotMatch(html, /Despachar todo|Marcar línea servida/);
    });
    await t.test('errores de operación 403/409 se muestran como alertas', () => {
      for (const message of ['403: No tienes permiso para realizar esta acción.', '409: Primero debes aceptar el pedido.']) {
        globalThis.__groupMutationError = message; globalThis.__groupResources = [{ data: [pedido] }];
        const html = render(Page, 'Bartender'); assert.match(html, /role="alert"/); assert.ok(html.includes(message));
      }
      delete globalThis.__groupMutationError;
    });
    await t.test('Mesero/Mesera sin selector editable ni dependencia del catálogo de responsables', () => {
      for (const rol of ['Mesero', 'Mesera']) {
        globalThis.__groupResources = [{ data: { datos: [], total: 0, limite: 20 } }, { loading: true, error: 'No cargar responsables' }];
        const html = render(Form, rol, { mesas: { data: [] } }); assert.match(html, /Lina Marcela/); assert.match(html, /Asignado automáticamente a tu sesión/); assert.doesNotMatch(html, /Selecciona un responsable|No cargar responsables/); assert.equal(can({ rol }, 'pedidos.asignarResponsable'), false);
      }
    });
    await t.test('Administrador/SuperAdmin conservan selector de responsables activos', () => {
      for (const rol of ['Administrador', 'SuperAdmin']) {
        globalThis.__groupResources = [{ data: { datos: [], total: 0, limite: 20 } }, { data: [{ id: 'otro', nombre: 'Otro responsable', estado: 'activo' }] }];
        const html = render(Form, rol, { mesas: { data: [] } }); assert.match(html, /Selecciona un responsable/); assert.match(html, /Otro responsable/); assert.equal(can({ rol }, 'pedidos.asignarResponsable'), true);
      }
    });
  } finally { delete globalThis.__groupResources; delete globalThis.__groupSelected; delete globalThis.__groupMutationError; await server.close(); }
});
