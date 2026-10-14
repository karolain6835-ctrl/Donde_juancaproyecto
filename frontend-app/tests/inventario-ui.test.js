import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { createServer } from 'vite';

test('Inventario: estados visuales y ajuste con componentes reales', async t => {
  const server = await createServer({ root: fileURLToPath(new URL('..', import.meta.url)), server: { middlewareMode: true }, appType: 'custom' });
  try {
    const { default: State } = await server.ssrLoadModule('/src/components/InventoryRemoteState.jsx');
    const { default: Movimientos } = await server.ssrLoadModule('/src/components/MovimientosSection.jsx');
    const { default: Ajuste } = await server.ssrLoadModule('/src/components/AjusteStockForm.jsx');
    const { AuthContext } = await server.ssrLoadModule('/src/context/useAuth.js');
    const render = component => renderToString(component);
    await t.test('cargando, error, vacío y datos son distintos', () => {
      const component = resource => React.createElement(State, { resource, empty: 'Lista vacía' }, 'Datos reales');
      assert.match(render(component({ loading: true })), /role="status"/);
      assert.match(render(component({ loading: false, error: 'Error de API' })), /Reintentar/);
      assert.match(render(component({ data: { datos: [] } })), /Lista vacía/);
      assert.equal(render(component({ data: { datos: [{}] } })), 'Datos reales');
    });
    await t.test('tabla muestra datos y referencias entregados por API', () => {
      const resource = { query: {}, setQuery() {}, data: { datos: [{ id: 'real-id', producto_nombre: 'Producto real', tipo: 'merma', cantidad: -2, usuario_nombre: 'Actor real', referencia_tipo: 'merma', referencia_id: 'referencia-real', creado_en: '2026-10-14T15:00:00Z' }] } };
      const html = render(React.createElement(Movimientos, { resource }));
      assert.match(html, /Producto real/); assert.match(html, /Actor real/); assert.match(html, /referencia-real/); assert.doesNotMatch(html, /MOV-/);
    });
    await t.test('ajuste usa producto real, stock actual y límites de entrada', () => {
      const html = render(React.createElement(AuthContext.Provider, { value: { user: { rol: 'Administrador' } } }, React.createElement(Ajuste, { productos: [{ id: 'p1', nombre: 'Producto real', stock: 12 }], initialId: 'p1' })));
      assert.match(html, /Producto real/); assert.match(html, /Stock actual/); assert.match(html, /min="0"/); assert.match(html, /max="2147483647"/); assert.match(html, /Diferencia/);
    });
  } finally { await server.close(); }
});
