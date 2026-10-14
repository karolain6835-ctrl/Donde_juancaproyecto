import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { createServer } from 'vite';
import { fileURLToPath } from 'node:url';
import { participanteBody, listarParticipantes, agregarParticipante } from '../src/services/participantesService.js';
import { pedidoBody, itemPedidoBody, detallePedido } from '../src/services/pedidosService.js';

test('Temporal no necesita contacto ni cliente global; registrado conserva ID real', () => {
  assert.deepEqual(participanteBody({ tipo_participante: 'temporal', nombre: ' Laura ', email: 'ignorado' }), { tipo_participante: 'temporal', nombre: 'Laura' });
  assert.deepEqual(participanteBody({ tipo_participante: 'registrado', clientes_id: 'cliente-real', nombre: 'ignorado' }), { tipo_participante: 'registrado', clientes_id: 'cliente-real' });
  for (const form of [{}, { tipo_participante: 'temporal', nombre: ' ' }, { tipo_participante: 'registrado', clientes_id: '' }]) assert.throws(() => participanteBody(form));
  assert.deepEqual(pedidoBody({ mesas_id: 'mesa', usuarios_id: 'responsable', clientes_id: null, participante_temporal: { nombre: ' Invitado ' } }), { mesas_id: 'mesa', usuarios_id: 'responsable', clientes_id: null, participante_temporal: { nombre: 'Invitado' } });
  assert.throws(() => pedidoBody({ mesas_id: 'mesa', usuarios_id: 'responsable', clientes_id: null }));
});
test('Consumo transmite participante real, conserva precio y admite históricos sin asignar', () => {
  const product = { id: 'producto', stock: 10, precio: 3500 };
  const body = itemPedidoBody({ productos_id: 'producto', cantidad_pedida: 2, participante_id: 'persona-real' }, [product]);
  assert.equal(body.participante_id, 'persona-real'); assert.equal(body.precio_unitario, 3500);
  assert.ok(!Object.hasOwn(itemPedidoBody({ productos_id: 'producto', cantidad_pedida: 2 }, [product]), 'participante_id'));
});
test('API de participantes usa JWT y propaga duplicado/inactivo 409; detalle admite cliente NULL', async () => {
  const fetchBefore = globalThis.fetch, storageBefore = globalThis.localStorage;
  let response, status = 200, request;
  globalThis.localStorage = { getItem: () => 'jwt-real' };
  globalThis.fetch = async (url, options) => { request = { url, ...options }; return new Response(JSON.stringify(response), { status }); };
  const person = { id: 'persona', nombre: 'Laura', tipo_participante: 'temporal', clientes_id: null, pedido_id: 'pedido' };
  try {
    response = { datos: [person] }; assert.deepEqual(await listarParticipantes('pedido'), [person]);
    assert.ok(request.url.endsWith('/pedidos/pedido/participantes')); assert.equal(request.headers.get('Authorization'), 'Bearer jwt-real');
    status = 201; response = { datos: person }; assert.deepEqual(await agregarParticipante('pedido', person), person);
    assert.equal(request.method, 'POST'); assert.deepEqual(JSON.parse(request.body), { tipo_participante: 'temporal', nombre: 'Laura' });
    status = 409; response = { error: 'Cliente inactivo.' }; await assert.rejects(agregarParticipante('pedido', { tipo_participante: 'registrado', clientes_id: 'inactivo' }), e => e.status === 409 && e.message === 'Cliente inactivo.');
    status = 200; response = { datos: { id: 'pedido', estado: 'abierto', mesas_id: 'mesa', usuarios_id: 'responsable', clientes_id: null, items: [] } };
    assert.equal((await detallePedido('pedido')).clientes_id, null);
  } finally { globalThis.fetch = fetchBefore; globalThis.localStorage = storageBefore; }
});

test('Mini formulario real: temporal y alta inline selecciona cliente confirmado sin cerrar pedido', async t => {
  const server = await createServer({ root: fileURLToPath(new URL('..', import.meta.url)), server: { middlewareMode: true }, appType: 'custom', plugins: [{ name: 'participantes-test', enforce: 'pre', transform(source, filename) {
    const file = filename.replaceAll('\\', '/');
    if (file.endsWith('/components/PedidoForm.jsx')) return source
      .replace('useState(null)', 'useState(globalThis.__pedidoParticipant || null)')
      .replace('return <>', 'globalThis.__pedidoSubmit = submit; return <>');
    if (file.endsWith('/components/ClientePedidoFields.jsx')) return source
      .replace("useState('registrado')", "useState(globalThis.__personaMode || 'registrado')")
      .replace("useState({ nombre: '', telefono: '', email: '' })", "useState(globalThis.__personaNew || { nombre: '', telefono: '', email: '' })")
      .replace('return <fieldset', 'globalThis.__personaRegister = register; return <fieldset');
    if (file.endsWith('/hooks/useRemoteCatalog.js')) return source
      .replace('export function useRemoteCatalog(loader) {', 'export function useRemoteCatalog(loader) { return { data: { datos: [], total: 0, limite: 20 }, loading: false, error: "" };')
      .replace('export function useCatalogMutation() {', 'export function useCatalogMutation() { return { busy: false, reset() {}, run: async (op, after) => { await op(); await after(); } };');
  } }] });
  const previousFetch = globalThis.fetch;
  try {
    const { default: Fields } = await server.ssrLoadModule('/src/components/ClientePedidoFields.jsx');
    const { default: Form } = await server.ssrLoadModule('/src/components/PedidoForm.jsx');
    const { AuthContext } = await server.ssrLoadModule('/src/context/useAuth.js');
    await t.test('temporal ofrece alias; registrado no exige contacto', () => {
      globalThis.__personaMode = 'temporal';
      const html = renderToString(React.createElement(Fields, { value: { nombre: 'Invitado 4' }, onChange() {} }));
      assert.match(html, /Nombre o alias/); assert.match(html, /Invitado 4/); assert.doesNotMatch(html, /type="email"/);
    });
    await t.test('registro inline hace POST real y selecciona resultado sin cerrar drawer', async () => {
      globalThis.__personaMode = 'nuevo'; globalThis.__personaNew = { nombre: 'Laura', telefono: '', email: '' };
      let selected, request;
      globalThis.fetch = async (url, options) => { request = { url, ...options }; return new Response(JSON.stringify({ cliente: { id: 'cliente-creado', nombre: 'Laura', telefono: null, email: null, estado: 'activo' } }), { status: 201 }); };
      const html = renderToString(React.createElement(Fields, { onChange(value) { selected = value; } }));
      assert.match(html, /Teléfono \(opcional\)/); assert.match(html, /Email \(opcional\)/);
      await globalThis.__personaRegister();
      assert.ok(request.url.endsWith('/clientes/registrar')); assert.equal(request.method, 'POST');
      assert.deepEqual(JSON.parse(request.body), { nombre: 'Laura', telefono: null, email: null });
      assert.deepEqual(selected, { tipo_participante: 'registrado', clientes_id: 'cliente-creado', nombre: 'Laura' });
    });
    await t.test('pedido temporal habilita creación y envía NULL sin alterar responsable de sesión', async () => {
      globalThis.__personaMode = 'temporal'; globalThis.__pedidoParticipant = { tipo_participante: 'temporal', nombre: 'Invitado' };
      let request, confirmed;
      globalThis.fetch = async (url, options) => { request = { url, ...options }; return new Response(JSON.stringify({ id_pedido: 'pedido-creado' }), { status: 201 }); };
      const html = renderToString(React.createElement(AuthContext.Provider, { value: { user: { id: 'mesero-real', rol: 'Mesero' } } }, React.createElement(Form, { mesas: { data: [{ id: 'mesa', numero: 1 }] }, initialMesa: 'mesa', onCreated(id) { confirmed = id; } })));
      assert.match(html, /Nuevo pedido/); assert.match(html, /<button class="drawer-primary-button" type="submit">Crear pedido<\/button>/);
      await globalThis.__pedidoSubmit({ preventDefault() {} });
      assert.deepEqual(JSON.parse(request.body), { mesas_id: 'mesa', usuarios_id: 'mesero-real', clientes_id: null, participante_temporal: { nombre: 'Invitado' } });
      assert.equal(confirmed, 'pedido-creado');
    });
  } finally {
    globalThis.fetch = previousFetch; delete globalThis.__personaMode; delete globalThis.__personaNew; delete globalThis.__personaRegister; delete globalThis.__pedidoParticipant; delete globalThis.__pedidoSubmit; await server.close();
  }
});
