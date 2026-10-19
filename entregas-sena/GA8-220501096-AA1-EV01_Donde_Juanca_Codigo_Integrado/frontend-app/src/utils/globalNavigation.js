import { can } from './permissions.js';

// Destinos reales del router; las secciones corresponden a pesta?as existentes.
export const globalDestinations = [
 ['Dashboard','/dashboard','dashboard.ver'],
 ['Inventario','/inventario','inventario.ver'],
 ['Productos','/inventario','productos.ver','productos'],
 ['Categorías','/inventario','categorias.ver','categorias'],
 ['Alertas','/inventario','alertas.ver','alertas'],
 ['Refrigeradores','/inventario','refrigeradores.ver','refrigeradores'],
 ['Pedidos','/operacion/pedidos','pedidos.ver'],
 ['Mesas','/operacion/mesas','mesas.ver'],
 ['Kanban','/operacion/kanban','kanban.ver'],
 ['Clientes','/clientes','clientes.ver'],
 ['Proveedores','/compras','proveedores.ver','proveedores'],
 ['Compras','/compras','compras.ver'],
 ['Juegos','/juegos','juegos.ver'],
 ['Caja y pagos','/caja','caja.ver'],
 ['Reportes','/reportes','reportes.ver'],
 ['Usuarios','/administracion','usuarios.ver','usuarios'],
 ['Auditoría','/administracion','auditoria.ver','auditoria'],
 ['Configuración','/administracion','configuracion.ver','configuracion'],
 ['Mi perfil',null,null,'perfil'],
].map(([label,path,permission,section])=>({label,path,permission,section}));
const normalize = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('es').trim();
export function searchDestinations(query,user) {
 const terms=normalize(query).split(/\s+/).filter(Boolean);
 if(!user||!terms.length)return [];
 return globalDestinations.filter(item=>(!item.permission||can(user,item.permission))&&terms.every(term=>normalize(item.label).includes(term)));
}
