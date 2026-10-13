import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';

test('Permisos visuales: rutas y sidebar con componentes reales', async t => {
  const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
  try {
    const { AuthContext } = await server.ssrLoadModule('/src/context/useAuth.js');
    const { default: App } = await server.ssrLoadModule('/src/App.jsx');
    const { default: ProtectedRoute } = await server.ssrLoadModule('/src/routes/ProtectedRoute.jsx');
    const { default: AdminLayout } = await server.ssrLoadModule('/src/layouts/AdminLayout/AdminLayout.jsx');
    let logouts = 0;
    const session = rol => ({ user: { id: 'u1', nombre: 'Ana', rol }, token: 'guardado', isAuthenticated: true, loading: false, logout() { logouts++; } });
    const render = (component, context, path = '/dashboard') => renderToString(React.createElement(MemoryRouter, { initialEntries: [path] }, React.createElement(AuthContext.Provider, { value: context }, component)));
    await t.test('URL de compras denegada a Bartender sin cerrar sesion', () => {
      const context = session('Bartender');
      const html = render(React.createElement(App), context, '/compras');
      assert.match(html, /403/);
      assert.match(html, /No tienes permiso/);
      assert.equal(context.token, 'guardado');
      assert.equal(logouts, 0);
    });
    await t.test('Sin sesion no renderiza contenido protegido; carga muestra status', () => {
      const content = React.createElement(ProtectedRoute, { permission: 'compras.ver' }, 'contenido protegido');
      assert.equal(render(content, { isAuthenticated: false, loading: false }), '');
      assert.match(render(content, { isAuthenticated: false, loading: true }), /role="status"/);
    });
    await t.test('Sidebar Bartender oculta compras, caja y administracion', () => {
      const html = render(React.createElement(AdminLayout), session('Bartender'));
      for (const path of ['/compras', '/caja', '/administracion']) assert.equal(html.includes(`href="${path}"`), false);
      for (const path of ['/inventario', '/operacion/kanban']) assert.equal(html.includes(`href="${path}"`), true);
    });
    await t.test('Mesero ve cuentas pendientes sin consulta de pagos ni cierres', () => {
      const html = render(React.createElement(App), session('Mesero'), '/caja');
      assert.match(html, /Cuentas pendientes/);
      assert.equal(html.includes('Cierres de caja'), false);
      assert.equal(html.includes('Cerrar caja'), false);
      assert.equal(html.includes('href="/administracion"'), false);
      const dashboard = render(React.createElement(App), session('Mesero'));
      assert.equal(dashboard.includes('Registrar producto'), false);
      assert.equal(dashboard.includes('Cerrar caja'), false);
    });
    await t.test('Cajero ve cierres; SuperAdmin ve administracion y compras', () => {
      const html = render(React.createElement(App), session('Cajero'), '/caja');
      assert.match(html, /Cierres de caja/);
      const admin = render(React.createElement(AdminLayout), session('SuperAdmin'));
      for (const path of ['/compras', '/administracion', '/caja']) assert.equal(admin.includes(`href="${path}"`), true);
    });
    await t.test('Inventario Cajero oculta movimientos, alertas y escritura', () => {
      const html = render(React.createElement(App), session('Cajero'), '/inventario');
      assert.equal(html.includes('Nueva categor'), false);
      assert.equal(html.includes('Nuevo producto'), false);
      assert.equal(html.includes('Movimientos'), false);
      assert.equal(html.includes('Alertas'), false);
    });
  } finally { await server.close(); }
});
