import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { createServer } from 'vite';
import { fileURLToPath } from 'node:url';
import { resumirProductosCuenta } from '../src/utils/resumenCuenta.js';
const line = (producto_id, cantidad_pedida, precio_unitario, subtotal) => ({ producto_id, nombre: producto_id === 'club' ? 'Club Colombia' : 'Águila', cantidad_pedida, precio_unitario, subtotal });

test('Resumen de cuenta: mismo producto en pedidos distintos suma cantidades y subtotales', () => {
  const items = [line('club', 2, '5000.00', '10000.00'), line('aguila', 1, '4800.00', '4800.00'), line('club', 2, '5000.00', '10000.00')];
  const before = structuredClone(items); items.forEach(Object.freeze); Object.freeze(items);
  assert.deepEqual(resumirProductosCuenta(items), [
    { producto_id: 'club', nombre: 'Club Colombia', cantidad_total: 4, subtotal_total: '20000.00', precio_unitario: '5000.00' },
    { producto_id: 'aguila', nombre: 'Águila', cantidad_total: 1, subtotal_total: '4800.00', precio_unitario: '4800.00' },
  ]);
  assert.deepEqual(items, before);
});
test('Precios distintos suman sus subtotales originales, sin precio único ni precio vigente', () => {
  const [row] = resumirProductosCuenta([line('club', 2, '5000.00', '10000.00'), line('club', 1, '5500.00', '5500.00')]);
  assert.equal(row.cantidad_total, 3); assert.equal(row.subtotal_total, '15500.00'); assert.equal(row.precio_unitario, null);
  assert.equal(resumirProductosCuenta([line('club', 2, '100.00', '123.45')])[0].subtotal_total, '123.45', 'La proyección usa el subtotal recibido, no otra fórmula');
});
test('Centavos exactos, cancelados excluidos y agrupación por ID, nunca por nombre', () => {
  const items = [line('a', 1, '0.10', '0.10'), line('a', 1, '0.20', '0.20'), { ...line('a', 99, '5000.00', '495000.00'), estado: 'cancelado' }, line('b', 1, '0.10', '0.10')];
  const rows = resumirProductosCuenta(items);
  assert.equal(rows.length, 2); assert.equal(rows[0].subtotal_total, '0.30'); assert.equal(rows[0].cantidad_total, 2);
  assert.deepEqual(resumirProductosCuenta([]), []);
});
test('MesaDetalle muestra resumen predeterminado, juegos separados y detalle/pedidos originales', async () => {
  const server = await createServer({ root: fileURLToPath(new URL('..', import.meta.url)), server: { middlewareMode: true }, appType: 'custom', plugins: [{ name: 'cuenta-resumen-test', enforce: 'pre', transform(source, filename) {
    if (filename.replaceAll('\\', '/').endsWith('/hooks/useRemoteCatalog.js')) return source.replace('export function useRemoteCatalog(loader) {', 'export function useRemoteCatalog(loader) { return globalThis.__cuentaResources.shift();');
  } }] });
  try {
    const { default: Detail } = await server.ssrLoadModule('/src/components/MesaDetalle.jsx');
    const { AuthContext } = await server.ssrLoadModule('/src/context/useAuth.js');
    const cuenta = { resumen: { subtotal_productos: '20300.00', subtotal_juegos: '12000.00', total_general: '32300.00' }, detalle_productos: [line('club', 2, '5000.00', '10000.00'), line('aguila', 1, '4800.00', '4800.00'), line('club', 1, '5500.00', '5500.00')], detalle_juegos: [{ id: 'juego-real', costo_tiempo: '12000.00' }] };
    const before = structuredClone(cuenta);
    globalThis.__cuentaResources = [{ data: cuenta }, { data: { datos: [{ id: 'pedido-1' }, { id: 'pedido-2' }], paginacion: { pagina: 1, total: 2 } } }, { data: { puede_liberarse: false, motivo: 'Pedidos abiertos.' } }];
    const html = renderToString(React.createElement(MemoryRouter, null, React.createElement(AuthContext.Provider, { value: { user: { rol: 'Cajero' } } }, React.createElement(Detail, { id: 'm', mesas: { data: [{ id: 'm', numero: 5, estado: 'ocupada' }] } }))));
    assert.match(html, /Resumen de consumo/); assert.equal(html.split('mesa-consumo-resumen').length - 1, 2);
    assert.match(html, /15\.500/); assert.match(html, /Precios diferentes/); assert.match(html, /Cantidad total/);
    assert.match(html, /<h3>Juegos<\/h3>/); assert.match(html, /juego-real/); assert.match(html, /12\.000/); assert.match(html, /32\.300/);
    assert.match(html, /<details class="mesa-cuenta-detalle">/); assert.match(html, /Detalle de consumos/);
    assert.match(html, /5\.000/); assert.match(html, /5\.500/);
    assert.match(html, /pedido-1/); assert.match(html, /pedido-2/); assert.equal(html.split('Ver pedido').length - 1, 2);
    assert.deepEqual(cuenta, before);
  } finally { delete globalThis.__cuentaResources; await server.close(); }
});
