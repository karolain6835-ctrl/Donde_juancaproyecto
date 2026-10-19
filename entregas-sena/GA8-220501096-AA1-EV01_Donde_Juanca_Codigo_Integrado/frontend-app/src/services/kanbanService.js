import { apiClient } from './apiClient.js';
import { invalidResponse } from './catalogoContract.js';
import { operationFail, operationPath } from './operacionContract.js';
export const estadosKanban = Object.freeze({ enviado: 'Enviado', preparando: 'Preparando', servido: 'Servido' });
export const estadosPedidoKanban = Object.freeze({ enviado: 'Enviado', preparando: 'Preparando', parcialmente_servido: 'Parcialmente servido', servido: 'Servido' });
export const siguienteKanban = Object.freeze({ enviado: 'preparando', preparando: 'servido' });
export function adaptKanban(response) {
  if (!response?.data || !['enviado', 'preparacion', 'servido'].every(key => Array.isArray(response.data[key]))) throw invalidResponse('kanban');
  return Object.entries({ enviado: 'enviado', preparacion: 'preparando', servido: 'servido' }).flatMap(([key, estado]) => response.data[key].map(row => {
    if (!row || typeof row.id_item !== 'string' || typeof row.id_pedido !== 'string' || typeof row.producto !== 'string' || !Number.isInteger(row.cantidad)) throw invalidResponse('tarjetas kanban');
    return { ...row, estado };
  }));
}
export async function listarKanban(options) {
  return adaptKanban(await apiClient('/kanban/tablero', options));
}
// Regla para el próximo tablero agrupado; no reemplaza aún las tarjetas por ítem.
export function estadoPedidoKanban(items) {
  const active = items.filter(item => item.estado !== 'cancelado');
  if (!active.length) return null;
  if (active.every(item => item.estado === 'enviado')) return 'enviado';
  if (active.every(item => item.estado === 'servido')) return 'servido';
  if (active.some(item => item.estado === 'servido')) return 'parcialmente_servido';
  return 'preparando';
}
export async function aceptarPedidoKanban(id) {
  const response = await apiClient(`/kanban/pedidos/${operationPath(id)}/aceptar`, { method: 'PATCH' });
  if (response?.pedido_id !== id || !Number.isInteger(response.items_aceptados) || response.items_aceptados < 0) throw invalidResponse('aceptación de pedido');
  return response;
}
export async function listarPedidosKanban(options) {
  const response = await apiClient('/kanban/pedidos', options);
  if (!Array.isArray(response?.datos)) throw invalidResponse('kanban agrupado');
  for (const pedido of response.datos) {
    if (!pedido || typeof pedido.pedido_id !== 'string' || !Object.hasOwn(estadosPedidoKanban, pedido.estado_derivado) || !Array.isArray(pedido.items) || pedido.items.some(item => typeof item.pedido_item_id !== 'string' || !Number.isInteger(item.cantidad_pedida) || !['enviado', 'preparando', 'servido', 'cancelado'].includes(item.estado))) throw invalidResponse('pedido kanban');
  }
  return response.datos;
}
export async function despacharTodoPedido(id) {
  const response = await apiClient(`/kanban/pedidos/${operationPath(id)}/despachar-todo`, { method: 'PATCH' });
  if (response?.pedido_id !== id || !Number.isInteger(response.items_despachados) || response.items_despachados < 0) throw invalidResponse('despacho de pedido');
  return response;
}
export async function moverTarjeta(tarjeta, nuevo_estado) {
  if (siguienteKanban[tarjeta.estado] !== nuevo_estado) operationFail('Solo se permite enviado → preparando → servido.');
  const response = await apiClient(`/kanban/${operationPath(tarjeta.id_item)}/estado`, { method: 'PUT', body: { nuevo_estado } });
  if (response?.estado_actual !== nuevo_estado || response?.tarjeta?.id_item !== tarjeta.id_item) throw invalidResponse('movimiento kanban');
  return response;
}
