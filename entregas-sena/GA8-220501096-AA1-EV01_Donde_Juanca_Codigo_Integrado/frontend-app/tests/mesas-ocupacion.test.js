import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { cambiarEstadoMesa, consultarLiberacionMesa, listarMesas } from '../src/services/mesasService.js';
import { crearPedido } from '../src/services/pedidosService.js';
import { sincronizarOperacion } from '../src/services/operacionContract.js';
test('Crear pedido reconsulta la mesa ocupada después de confirmar, sin F5 ni estado optimista', async () => {
  const previous = globalThis.fetch; let confirm;
  const displayed = { mesas: [{ id: 'm', numero: 1, estado: 'disponible' }] };
  globalThis.fetch = async url => {
    if (url.endsWith('/pedidos')) return new Promise(resolve => { confirm = resolve; });
    return new Response(JSON.stringify({ datos: url.endsWith('/ocupada') ? [{ id: 'm', numero: 1, estado: 'ocupada' }] : [] }), { status: 200 });
  };
  try {
    const pending = sincronizarOperacion(() => crearPedido({ mesas_id: 'm', usuarios_id: 'u', clientes_id: 'c' }), [async () => { displayed.mesas = await listarMesas(); }]);
    assert.equal(displayed.mesas[0].estado, 'disponible');
    confirm(new Response(JSON.stringify({ id_pedido: 'p' }), { status: 201 }));
    await pending; assert.equal(displayed.mesas[0].estado, 'ocupada');
  } finally { globalThis.fetch = previous; }
});
test('Liberación consulta fuente backend, conserva 409 y no cambia estado optimistamente', async () => {
  const previous = globalThis.fetch;
  const mesa = { id: 'm', estado: 'ocupada' }; let status = 200, response = { datos: { mesa_id: 'm', puede_liberarse: false, motivo: 'Tiene pedidos abiertos.' } }, request;
  globalThis.fetch = async (url, options) => { request = { url, ...options }; return new Response(JSON.stringify(response), { status }); };
  try {
    assert.equal((await consultarLiberacionMesa('m')).puede_liberarse, false); assert.ok(request.url.endsWith('/mesas/m/liberacion'));
    status = 409; response = { error: 'No se puede liberar la mesa: tiene saldo pendiente.' };
    let refreshes = 0;
    await assert.rejects(sincronizarOperacion(() => cambiarEstadoMesa('m', 'disponible'), [async () => refreshes++]), error => error.status === 409 && error.message === response.error);
    assert.equal(refreshes, 0); assert.equal(mesa.estado, 'ocupada');
    status = 200; response = { mensaje: 'Estado confirmado.' };
    await sincronizarOperacion(() => cambiarEstadoMesa('m', 'ocupada'), [async () => refreshes++]);
    assert.equal(refreshes, 1); assert.equal(request.method, 'PATCH'); assert.deepEqual(JSON.parse(request.body), { estado: 'ocupada' });
  } finally { globalThis.fetch = previous; }
});
test('MesaDetalle ofrece ocupar/liberar según estado real y consulta protegida', async t => {
  const server = await createServer({ root: fileURLToPath(new URL('..', import.meta.url)), server: { middlewareMode: true }, appType: 'custom', plugins: [{
    name: 'mesa-occupation-resources', enforce: 'pre', transform(source, filename) {
      if (filename.replaceAll('\\', '/').endsWith('/hooks/useRemoteCatalog.js')) return source.replace('export function useRemoteCatalog(loader) {', 'export function useRemoteCatalog(loader) { return globalThis.__mesaResources.shift() || { data: { sesion: null, datos: [] } };').replace('export function useCatalogMutation() {', 'export function useCatalogMutation() { if (globalThis.__mesaError) return { busy: false, error: globalThis.__mesaError, success: "" };');
    },
  }] });
  try {
    const { default: Detail } = await server.ssrLoadModule('/src/components/MesaDetalle.jsx');
    const { AuthContext } = await server.ssrLoadModule('/src/context/useAuth.js');
    const render = (estado, availability) => {
      globalThis.__mesaResources = [{ data: { resumen: { subtotal_productos: 0, total_general: 0 }, detalle_productos: [] } }, { data: { datos: [] } }, { data: availability }];
      return renderToString(React.createElement(MemoryRouter, null, React.createElement(AuthContext.Provider, { value: { user: { rol: 'Administrador' } } }, React.createElement(Detail, { id: 'm', mesas: { data: [{ id: 'm', numero: 1, estado }] } }))));
    };
    await t.test('disponible muestra ocupar; reconsulta ocupada muestra liberar', () => {
      assert.match(render('disponible', { puede_liberarse: true }), /Ocupar mesa/);
      assert.doesNotMatch(render('ocupada', { puede_liberarse: true }), /Ocupar mesa/);
      assert.match(render('ocupada', { puede_liberarse: true }), /<button class="drawer-secondary-button">Liberar mesa<\/button>/);
    });
    await t.test('actividad pendiente deshabilita liberar e informa motivo', () => {
      const html = render('ocupada', { puede_liberarse: false, motivo: 'No se puede liberar: juego activo.' });
      assert.match(html, /disabled="">Liberar mesa/); assert.match(html, /juego activo/);
    });
    await t.test('409 de carrera permanece visible y no altera el estado mostrado', () => {
      globalThis.__mesaError = 'No se puede liberar: tiene saldo pendiente.';
      const html = render('ocupada', { puede_liberarse: true });
      assert.match(html, /role="alert"/); assert.match(html, /saldo pendiente/); assert.match(html, /Ocupada/); delete globalThis.__mesaError;
    });
  } finally { delete globalThis.__mesaResources; delete globalThis.__mesaError; await server.close(); }
});
