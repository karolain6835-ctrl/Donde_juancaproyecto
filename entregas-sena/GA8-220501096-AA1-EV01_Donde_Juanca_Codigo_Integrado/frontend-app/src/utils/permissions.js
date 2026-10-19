const ADMIN = ['Administrador', 'SuperAdmin'];
const SERVICE = [...ADMIN, 'Mesero', 'Mesera'];
const CASH = [...ADMIN, 'Cajero'];
const SERVICE_CASH = [...SERVICE, 'Cajero'];
const BAR = [...ADMIN, 'Bartender'];
const SERVICE_BAR = [...SERVICE, 'Bartender'];
const ALL = [...SERVICE_CASH, 'Bartender'];

// Permisos operativos: reflejan autorizarRoles en backend/src/routes.
export const permissions = Object.freeze(Object.fromEntries([
  [ALL, ['categorias.ver', 'productos.ver']],
  [ADMIN, ['mesas.crear', 'mesas.editarNumero', 'productos.crear', 'productos.editar', 'productos.eliminar',
    'inventario.movimientos', 'inventario.ajustar', 'mermas.registrar',
    'proveedores.ver', 'proveedores.crear', 'proveedores.editar',
    'compras.ver', 'compras.crear', 'compras.recibir', 'compras.cancelar', 'compras.reversar',
    'juegos.mantenimiento', 'refrigeradores.ver', 'refrigeradores.crear', 'refrigeradores.editar', 'configuracion.ver', 'configuracion.editar', 'clientes.actualizar', 'auditoria.ver', 'usuarios.ver', 'usuarios.registrar', 'usuarios.cambiarEstado']],
  [SERVICE, ['mesas.trasladar', 'pedidos.crear', 'pedidos.agregarItems', 'juegos.iniciar', 'juegos.finalizar']],
  [SERVICE_CASH, ['mesas.ver', 'mesas.cuenta', 'pedidos.ver', 'pagos.crear', 'pagos.division.ver', 'juegos.ver',
    'clientes.ver', 'clientes.crear', 'divisiones.ver', 'divisiones.crear', 'divisiones.asignarItems', 'divisiones.cuotas']],
  [CASH, ['mesas.cambiarEstado', 'pedidos.cancelarItem', 'pagos.ver', 'pagos.verificar', 'divisiones.cancelar', 'divisiones.completar',
    'ventas.facturar', 'comprobantes.ver', 'cierres.ver', 'cierres.crear']],
  [SERVICE_BAR, ['alertas.ver', 'alertas.vista', 'alertas.silenciar', 'alertas.reactivar', 'alertas.resolver',
    'kanban.ver', 'kanban.actualizar']],
  [BAR, ['mermas.ver', 'mermas.motivos']],
].flatMap(([roles, actions]) => actions.map(action => [action, Object.freeze([...roles])]))));

// Acceso a páginas agrupadas, derivado de funciones útiles ya autorizadas.
// Dashboard/reportes/administración no representan endpoints nuevos del backend.
const pages = {
  'dashboard.ver': ['productos.ver'],
  'inventario.ver': ['productos.ver', 'alertas.ver', 'mermas.ver'],
  'caja.ver': ['pagos.crear', 'pagos.ver', 'divisiones.ver', 'cierres.ver'],
  'administracion.ver': ['usuarios.registrar', 'usuarios.cambiarEstado'],
  'reportes.ver': ['comprobantes.ver', 'inventario.movimientos'],
};

export function can(user, permission) {
  if (!user || typeof user.rol !== 'string') return false;
  // Regla de asignación dentro de crear pedido; no es un permiso de ruta adicional.
  if (permission === 'pedidos.asignarResponsable') return ADMIN.includes(user.rol);
  if (Object.hasOwn(permissions, permission)) return permissions[permission].includes(user.rol);
  if (Object.hasOwn(pages, permission)) return pages[permission].some(action => can(user, action));
  return false;
}
