import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { can, permissions } from '../src/utils/permissions.js';
import { formatCurrency } from '../src/utils/formatCurrency.js';
import { formatDate, formatDateTime, formatTime } from '../src/utils/dateTime.js';

const user = rol => ({ id: 'u1', rol });
test('Todos los permisos operativos coinciden con los roles de las rutas reales', () => {
  const contracts = [
    ['categorias', 'get', '/', ['categorias.ver']],
    ['productos', 'get', '/', ['productos.ver']],
    ['productos', 'post', '/', ['productos.crear']],
    ['productos', 'put', '/:id', ['productos.editar']],
    ['productos', 'delete', '/:id', ['productos.eliminar']],
    ['mesas', 'get', '/estado/:estado', ['mesas.ver']],
    ['mesas', 'post', '/', ['mesas.crear']],
    ['mesas', 'patch', '/:id/numero', ['mesas.editarNumero']],
    ['mesas', 'get', '/:mesa_id/cuenta', ['mesas.cuenta']],
    ['mesas', 'post', '/traslado', ['mesas.trasladar']],
    ['mesas', 'patch', '/:id/estado', ['mesas.cambiarEstado']],
    ['pedidos', 'post', '/', ['pedidos.crear']],
    ['pedidos', 'post', '/:id_pedido/items', ['pedidos.agregarItems']],
    ['pedidos', 'get', '/:id', ['pedidos.ver']],
    ['pedidos', 'put', '/items/:id/cancelar', ['pedidos.cancelarItem']],
    ['pagos', 'post', '/', ['pagos.crear']],
    ['pagos', 'get', '/:id', ['pagos.ver']],
    ['pagos', 'patch', '/:id/verificar', ['pagos.verificar']],
    ['juegos', 'get', '/activos', ['juegos.ver']],
    ['juegos', 'post', '/iniciar', ['juegos.iniciar']],
    ['juegos', 'put', '/:id/terminar', ['juegos.finalizar']],
    ['inventario', 'get', '/movimientos', ['inventario.movimientos']],
    ['inventario', 'put', '/actualizar-stock', ['inventario.ajustar']],
    ['inventario', 'get', '/alertas', ['alertas.ver']],
    ['inventario', 'patch', '/alertas/:id/vista', ['alertas.vista']],
    ['inventario', 'patch', '/alertas/:id/silenciar', ['alertas.silenciar']],
    ['inventario', 'patch', '/alertas/:id/reactivar', ['alertas.reactivar']],
    ['inventario', 'patch', '/alertas/:id/resolver', ['alertas.resolver']],
    ['mermas', 'get', '/', ['mermas.ver']],
    ['mermas', 'get', '/motivos', ['mermas.motivos']],
    ['mermas', 'post', '/', ['mermas.registrar']],
    ['proveedores', 'get', '/', ['proveedores.ver']],
    ['proveedores', 'post', '/', ['proveedores.crear']],
    ['proveedores', 'put', '/:id', ['proveedores.editar']],
    ['compras', 'get', '/', ['compras.ver']],
    ['compras', 'post', '/', ['compras.crear']],
    ['compras', 'patch', '/:id/recibir', ['compras.recibir']],
    ['compras', 'patch', '/:id/cancelar', ['compras.cancelar']],
    ['compras', 'patch', '/:id/recepciones/:recepcion_id/reversar', ['compras.reversar']],
    ['clientes', 'get', '/', ['clientes.ver']],
    ['clientes', 'post', '/registrar', ['clientes.crear']],
    ['clientes', 'put', '/:id', ['clientes.actualizar']],
    ['ventas', 'post', '/pedido', ['ventas.crearPedido']],
    ['ventas', 'post', '/facturar', ['ventas.facturar']],
    ['ventas', 'get', '/comprobantes', ['comprobantes.ver']],
    ['cierresCaja', 'get', '/', ['cierres.ver']],
    ['cierresCaja', 'post', '/', ['cierres.crear']],
    ['kanban', 'get', '/tablero', ['kanban.ver']],
    ['kanban', 'put', '/:id/estado', ['kanban.actualizar']],
    ['pedidos', 'get', '/:pedido_id/division-contexto', ['divisiones.ver']],
    ['divisiones', 'get', '/:id', ['divisiones.ver']],
    ['divisiones', 'get', '/:id/pagos', ['pagos.division.ver']],
    ['divisiones', 'post', '/', ['divisiones.crear']],
    ['divisiones', 'post', '/:id/asignar-items', ['divisiones.asignarItems']],
    ['divisiones', 'post', '/:id/cuotas', ['divisiones.cuotas']],
    ['divisiones', 'patch', '/:id/cancelar', ['divisiones.cancelar']],
    ['divisiones', 'patch', '/:id/completar', ['divisiones.completar']],
    ['configuracion', 'get', '/', ['configuracion.ver']],
    ['configuracion', 'put', '/', ['configuracion.editar']],
    ['auditoria', 'get', '/', ['auditoria.ver']],
    ['usuarios', 'get', '/', ['usuarios.ver']],
    ['usuarios', 'get', '/roles', ['usuarios.ver']],
    ['usuarios', 'post', '/registrar', ['usuarios.registrar']],
    ['usuarios', 'put', '/:id/estado', ['usuarios.cambiarEstado']],
  ];
  const covered = [];
  for (const [file, method, path, actions] of contracts) {
    const source = readFileSync(new URL(`../../backend/src/routes/${file}Routes.js`, import.meta.url), 'utf8');
    const line = source.split('\n').find(line => line.includes(`router.${method}(`) && line.includes(`'${path}'`));
    assert.ok(line, `${file}: ${method} ${path}`);
    const roles = [...line.match(/autorizarRoles\(([^)]+)\)/)[1].matchAll(/'([^']+)'/g)].map(match => match[1]);
    for (const action of actions) {
      covered.push(action);
      assert.deepEqual([...permissions[action]].sort(), roles.sort(), action);
    }
  }
  assert.deepEqual([...new Set(covered)].sort(), Object.keys(permissions).sort());
});
test('Administrador tiene permisos administrativos', () => {
  for (const action of ['productos.editar', 'compras.crear', 'usuarios.registrar', 'inventario.ajustar']) assert.equal(can(user('Administrador'), action), true);
});
test('Administrador y SuperAdmin equivalentes en toda la matriz', () => {
  for (const permission of Object.keys(permissions)) assert.equal(can(user('Administrador'), permission), can(user('SuperAdmin'), permission), permission);
});
test('Mesero y Mesera equivalentes en toda la matriz', () => {
  for (const permission of Object.keys(permissions)) assert.equal(can(user('Mesero'), permission), can(user('Mesera'), permission), permission);
  assert.equal(can(user('Mesero'), 'pedidos.crear'), true);
  assert.equal(can(user('Mesero'), 'usuarios.registrar'), false);
});
test('Bartender no accede a compras, pero ve alertas, mermas y Kanban', () => {
  assert.equal(can(user('Bartender'), 'compras.ver'), false);
  for (const permission of ['alertas.ver', 'mermas.ver', 'kanban.ver']) assert.equal(can(user('Bartender'), permission), true);
  for (const permission of ['mesas.ver', 'pagos.crear', 'mermas.registrar']) assert.equal(can(user('Bartender'), permission), false);
});
test('Cajero accede a caja sin permisos de crear pedidos ni finalizar juegos', () => {
  for (const permission of ['caja.ver', 'pagos.verificar', 'cierres.crear']) assert.equal(can(user('Cajero'), permission), true);
  for (const permission of ['pedidos.crear', 'juegos.finalizar', 'alertas.ver']) assert.equal(can(user('Cajero'), permission), false);
});
test('Permisos mixtos de servicio no otorgan consulta de pagos ni movimientos', () => {
  assert.equal(can(user('Mesero'), 'caja.ver'), true);
  assert.equal(can(user('Mesero'), 'pagos.crear'), true);
  assert.equal(can(user('Mesero'), 'pagos.ver'), false);
  assert.equal(can(user('Mesero'), 'inventario.movimientos'), false);
});
test('Roles ficticios, desconocidos y permisos inexistentes se deniegan', () => {
  for (const rol of ['Caja', 'Juegos', 'administrador', 'Desconocido', undefined]) assert.equal(can(user(rol), 'compras.ver'), false);
  assert.equal(can(null, 'productos.ver'), false);
  assert.equal(can(user('Administrador'), 'categorias.editar'), false);
});
for (const [value, expected] of [[2844.44, '$2.844,44'], [19560, '$19.560,00'], ['2844.44', '$2.844,44'], [0, '$0,00'], [-12.5, '-$12,50']]) {
  test(`COP conserva decimales: ${value}`, () => assert.equal(formatCurrency(value).replace(/\s/g, ''), expected));
}
for (const value of [null, undefined, 'invalido', '', ' ', NaN, Infinity, {}, true]) {
  test(`COP tolera valor no monetario: ${String(value)}`, () => assert.equal(formatCurrency(value), '\u2014'));
}
test('Fecha nula, corrupta o imposible no rompe UI', () => {
  for (const value of [null, undefined, '', 'mal', '2026-02-30', '2026-13-01', '2026-10-13 25:00:00', new Date('mal'), {}]) {
    for (const format of [formatDate, formatDateTime, formatTime]) assert.equal(format(value), '\u2014');
  }
});
test('Timestamp UTC sin zona equivale a ISO con Z en zona local', () => {
  for (const format of [formatDate, formatDateTime, formatTime]) assert.equal(format('2026-10-13 18:30:00'), format('2026-10-13T18:30:00Z'));
});
test('Respeta offsets y conserva fechas de calendario', () => {
  assert.equal(formatDateTime('2026-10-13T13:30:00-05:00'), formatDateTime('2026-10-13T18:30:00Z'));
  assert.equal(formatDate('2026-10-13'), formatDate(new Date(2026, 9, 13)));
});
