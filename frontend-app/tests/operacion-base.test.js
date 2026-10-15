import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { createServer } from 'vite';
import { fileURLToPath } from 'node:url';
import { mesaNumeroBody, guardarNumeroMesa } from '../src/services/mesasService.js';
import { can } from '../src/utils/permissions.js';

test('Administración estructural solo Admin/SuperAdmin y contrato numérico mínimo', () => {
  for (const rol of ['Administrador','SuperAdmin','Mesero','Mesera','Cajero','Bartender']) {
    for (const p of ['mesas.crear','mesas.editarNumero']) assert.equal(can({ rol }, p), ['Administrador','SuperAdmin'].includes(rol));
  }
  assert.deepEqual(mesaNumeroBody({ numero: '12', estado: 'ocupada' }), { numero: 12 });
  for (const numero of ['', 0, -1, 1.5, null, '2e3', 2147483648]) assert.throws(() => mesaNumeroBody({ numero }));
});
test('Alta y cambio de número usan API real y propagan duplicados', async () => {
  const previous = globalThis.fetch; let request, status = 201, response = { datos: { id: 'mesa-real', numero: 12, estado: 'disponible' } };
  globalThis.fetch = async (url, options) => { request = { url, ...options }; return new Response(JSON.stringify(response), { status }); };
  try {
    assert.equal((await guardarNumeroMesa({ numero: '12' })).estado, 'disponible');
    assert.ok(request.url.endsWith('/mesas')); assert.equal(request.method, 'POST'); assert.deepEqual(JSON.parse(request.body), { numero: 12 });
    status = 200; await guardarNumeroMesa({ numero: 12 }, 'mesa-real'); assert.equal(request.method, 'PATCH'); assert.ok(request.url.endsWith('/mesas/mesa-real/numero'));
    status = 409; response = { error: 'Ya existe una mesa con ese número.' }; await assert.rejects(guardarNumeroMesa({ numero: 12 }), e => e.status === 409 && e.message === response.error);
  } finally { globalThis.fetch = previous; }
});

test('UI real de participantes y administración de mesas: permisos, confirmación y reconsulta', async t => {
  const server = await createServer({ root: fileURLToPath(new URL('..', import.meta.url)), server: { middlewareMode: true }, appType: 'custom', plugins: [{ name: 'operacion-base-test', enforce: 'pre', transform(source, filename) {
    const file = filename.replaceAll('\\','/');
    if (file.endsWith('/hooks/useRemoteCatalog.js')) return source
      .replace('export function useRemoteCatalog(loader) {', 'export function useRemoteCatalog(loader) { return globalThis.__baseResource || { data: { datos: [], total: 0, limite: 20 } };')
      .replace('export function useCatalogMutation() {', 'export function useCatalogMutation() { return { busy: false, error: globalThis.__baseError || "", reset() {}, run: async (op, after) => { try { await op(); await after(); } catch(error) { globalThis.__baseError = error.message; } } };');
    if (file.endsWith('/components/MesaForm.jsx')) return source
      .replace("useState(mesa ? String(mesa.numero) : '')", "useState(mesa ? String(mesa.numero) : '12')")
      .replace('if (!allowed) return null;', 'globalThis.__baseSubmit = submit; if (!allowed) return null;');
    if (file.endsWith('/components/PedidoParticipantes.jsx')) return source
      .replace('useState(null)', 'useState(globalThis.__basePerson || null)')
      .replace('return <section', 'globalThis.__baseAdd = add; return <section');
  } }] });
  const previousFetch = globalThis.fetch;
  try {
    const { default: Page } = await server.ssrLoadModule('/src/pages/MesasPage.jsx');
    const { default: Form } = await server.ssrLoadModule('/src/components/MesaForm.jsx');
    const { default: Participants } = await server.ssrLoadModule('/src/components/PedidoParticipantes.jsx');
    const { AuthContext } = await server.ssrLoadModule('/src/context/useAuth.js');
    const render = (Component, props, rol = 'Administrador') => renderToString(React.createElement(MemoryRouter, null, React.createElement(AuthContext.Provider, { value: { user: { id: 'actor', rol } } }, React.createElement(Component, props))));
    await t.test('Admin/SuperAdmin ven Nueva mesa, Mesero/Mesera/Cajero no', () => {
      globalThis.__baseResource = { data: [], loading: false };
      for (const rol of ['Administrador','SuperAdmin']) assert.match(render(Page, {}, rol), /Nueva mesa/);
      for (const rol of ['Mesero','Mesera','Cajero']) assert.doesNotMatch(render(Page, {}, rol), /Nueva mesa/);
      assert.equal(render(Form, {}, 'Mesero'), '');
    });
    await t.test('alta espera confirmación y reconsulta antes de cerrar; 409 visible sin reconsulta', async () => {
      const events = []; let confirm;
      globalThis.fetch = () => new Promise(resolve => { confirm = resolve; });
      const props = { onSaved: async () => events.push('reconsulta'), onClose: () => events.push('cerrar') };
      assert.match(render(Form, props), /Número de mesa/);
      const pending = globalThis.__baseSubmit({ preventDefault() {} }); assert.deepEqual(events, []);
      confirm(new Response(JSON.stringify({ datos: { id: 'nueva', numero: 12, estado: 'disponible' } }), { status: 201 }));
      await pending; assert.deepEqual(events, ['reconsulta','cerrar']);
      events.length = 0; globalThis.fetch = async () => new Response(JSON.stringify({ error: 'Ya existe una mesa con ese número.' }), { status: 409 });
      render(Form, props); await globalThis.__baseSubmit({ preventDefault() {} }); assert.deepEqual(events, []);
      assert.match(render(Form, props), /role="alert">Ya existe una mesa/); delete globalThis.__baseError;
    });
    await t.test('lista mixta, homónimos, vacío, loading y error con reintento', () => {
      const people = [{ id: 'c', nombre: 'Carlos', tipo_participante: 'registrado' }, { id: 'l', nombre: 'Laura', tipo_participante: 'registrado' }, { id: 't1', nombre: 'Felipe', tipo_participante: 'temporal' }, { id: 't2', nombre: 'Felipe', tipo_participante: 'temporal' }];
      const html = render(Participants, { id: 'p', resource: { data: people } });
      assert.match(html, /Clientes en la mesa/); assert.match(html, /Carlos/); assert.match(html, /Laura/); assert.equal(html.split('<strong>Felipe</strong>').length - 1, 2);
      assert.match(render(Participants, { resource: { loading: true } }), /Cargando/);
      assert.match(render(Participants, { resource: { error: 'Error real' } }), /Error real/);
      assert.match(render(Participants, { resource: { error: 'Error real' } }), /Reintentar/);
      assert.match(render(Participants, { resource: { data: [] } }), /no hay clientes/);
    });
    await t.test('alta de participante usa ID real y reconsulta el recurso compartido por selector', async () => {
      delete globalThis.__baseResource; globalThis.__basePerson = { tipo_participante: 'registrado', clientes_id: 'cliente-real', nombre: 'Carlos' };
      let request, refreshed = 0;
      globalThis.fetch = async (url, options) => { request = { url, ...options }; return new Response(JSON.stringify({ datos: { id: 'persona-real', nombre: 'Carlos', tipo_participante: 'registrado', clientes_id: 'cliente-real', pedido_id: 'p' } }), { status: 201 }); };
      render(Participants, { id: 'p', editable: true, resource: { data: [], refresh: async () => refreshed++ } });
      await globalThis.__baseAdd({ preventDefault() {} });
      assert.ok(request.url.endsWith('/pedidos/p/participantes')); assert.deepEqual(JSON.parse(request.body), { tipo_participante: 'registrado', clientes_id: 'cliente-real' }); assert.equal(refreshed, 1);
    });
  } finally {
    globalThis.fetch = previousFetch;
    for (const k of ['__baseResource','__baseError','__basePerson','__baseAdd','__baseSubmit']) delete globalThis[k];
    await server.close();
  }
});
