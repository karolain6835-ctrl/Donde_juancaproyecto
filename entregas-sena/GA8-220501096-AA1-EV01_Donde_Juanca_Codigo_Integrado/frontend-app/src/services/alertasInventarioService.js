import { apiClient, ApiError } from './apiClient.js';
import { invalidResponse } from './catalogoContract.js';
import { queryString, inventoryId } from './inventarioService.js';

export const alertActions = Object.freeze({ activa: ['vista','silenciar','resolver'], vista: ['silenciar','resolver'], silenciada: ['reactivar','resolver'], resuelta: [] });
export function adaptAlerta(row) {
  if (!row || typeof row.id !== 'string' || typeof row.productos_id !== 'string' || !['bajo','agotado'].includes(row.tipo) ||
      !Object.hasOwn(alertActions, row.estado) || !Number.isInteger(row.stock_actual) || !Number.isInteger(row.stock_minimo) ||
      typeof row.creado_en !== 'string' || typeof row.actualizado_en !== 'string' || !(row.resuelto_en === null || typeof row.resuelto_en === 'string')) throw invalidResponse('alertas');
  return { ...row };
}
export function adaptAlertas(response) {
  if (!response || !Array.isArray(response.alertas) || !Number.isSafeInteger(response.total_alertas)) throw invalidResponse('alertas');
  const p = response.paginacion;
  if (!p || !Number.isSafeInteger(p.pagina) || p.pagina < 1 || !Number.isSafeInteger(p.total_paginas)) throw invalidResponse('alertas');
  return { datos: response.alertas.map(adaptAlerta), paginacion: p };
}
export async function listarAlertas({ pagina = 1, limite = 20, estado, producto_id, tipo } = {}, options) {
  return adaptAlertas(await apiClient(`/inventario/alertas?${queryString({ pagina, limite, estado, producto_id, tipo })}`, options));
}
export async function detalleAlerta(id, options) {
  const response = await apiClient(`/inventario/alertas/${encodeURIComponent(inventoryId(id, 'una alerta'))}`, options);
  const alerta = adaptAlerta(response?.alerta);
  if (!Array.isArray(alerta.historial)) throw invalidResponse('historial de alerta');
  return alerta;
}
export async function actuarAlerta(id, action) {
  if (!['vista','silenciar','reactivar','resolver'].includes(action)) throw new ApiError('Acción inválida.', { status: 400, code: 'VALIDATION_ERROR' });
  const response = await apiClient(`/inventario/alertas/${encodeURIComponent(inventoryId(id, 'una alerta'))}/${action}`, { method: 'PATCH' });
  adaptAlerta(response?.alerta);
  return response;
}
