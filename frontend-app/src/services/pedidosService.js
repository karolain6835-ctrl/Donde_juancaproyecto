import { apiClient } from './apiClient.js';
import { invalidResponse } from './catalogoContract.js';
import { operationFail, operationId, operationPath } from './operacionContract.js';
export const estadosPedido = Object.freeze({ abierto: 'Abierto', cerrado: 'Cerrado', cancelado: 'Cancelado' });
export function pedidoBody(form) {
  // usuarios_id es el responsable asignado; nunca sustituirlo por el ejecutor JWT.
  const body = { mesas_id: operationId(form.mesas_id), usuarios_id: operationId(form.usuarios_id), clientes_id: form.clientes_id === null ? null : operationId(form.clientes_id) };
  if (form.participante_id) body.participante_id = operationId(form.participante_id);
  if (body.clientes_id === null && !body.participante_id) {
    if (typeof form.participante_temporal?.nombre !== 'string' || !form.participante_temporal.nombre.trim() || [...form.participante_temporal.nombre.trim()].length > 100) operationFail('Indica el nombre o alias del participante.');
    body.participante_temporal = { nombre: form.participante_temporal.nombre.trim() };
  }
  return body;
}
export function itemPedidoBody(form, productos) {
  const product = productos.find(p => p.id === form.productos_id);
  if (!product) operationFail('Selecciona un producto real.');
  const cantidad_pedida = Number(form.cantidad_pedida);
  if (!['string', 'number'].includes(typeof form.cantidad_pedida) || !Number.isInteger(cantidad_pedida) || cantidad_pedida <= 0 || cantidad_pedida > 2147483647) operationFail('La cantidad debe ser un entero mayor que cero.');
  if (cantidad_pedida > product.stock) operationFail('La cantidad supera el stock disponible.');
  if (!Number.isFinite(product.precio) || product.precio <= 0) operationFail('El producto no tiene un precio de venta válido.');
  return { productos_id: operationId(product.id), cantidad_pedida, precio_unitario: product.precio,
    ...(form.participante_id ? { participante_id: operationId(form.participante_id) } : {}) };
}
function adaptPedido(row) {
  if (!row || typeof row.id !== 'string' || !Object.hasOwn(estadosPedido, row.estado) || !['mesas_id', 'usuarios_id'].every(key => typeof row[key] === 'string') || !(row.clientes_id === null || typeof row.clientes_id === 'string')) throw invalidResponse('pedidos');
  return row;
}
export async function listarPedidos({ pagina = 1, limite = 20, estado, mesas_id } = {}, options) {
  const query = new URLSearchParams(Object.entries({ pagina, limite, estado, mesas_id }).filter(([, value]) => value !== undefined && value !== ''));
  const response = await apiClient(`/pedidos?${query}`, options);
  if (!Array.isArray(response?.datos) || !Number.isInteger(response.paginacion?.pagina) || !Number.isInteger(response.paginacion?.total)) throw invalidResponse('pedidos');
  return { ...response, datos: response.datos.map(adaptPedido) };
}
export async function crearPedido(form) {
  const response = await apiClient('/pedidos', { method: 'POST', body: pedidoBody(form) });
  if (typeof response?.id_pedido !== 'string') throw invalidResponse('creación de pedido');
  return response;
}
export async function detallePedido(id, options) {
  const row = adaptPedido((await apiClient(`/pedidos/${operationPath(id)}`, options))?.datos);
  if (!Array.isArray(row.items)) throw invalidResponse('detalle de pedido');
  return row;
}
export async function agregarItemPedido(id, form, productos) {
  const response = await apiClient(`/pedidos/${operationPath(id)}/items`, { method: 'POST', body: itemPedidoBody(form, productos) });
  if (typeof response?.id_item !== 'string' || !Number.isInteger(response.stock_restante)) throw invalidResponse('ítem de pedido');
  return response;
}
export async function cancelarItemPedido(id) {
  const response = await apiClient(`/pedidos/items/${operationPath(id)}/cancelar`, { method: 'PUT' });
  if (response?.exito !== true || typeof response.id_item !== 'string') throw invalidResponse('cancelación de ítem');
  return response;
}
