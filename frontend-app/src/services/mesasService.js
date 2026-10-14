import { apiClient } from './apiClient.js';
import { invalidResponse } from './catalogoContract.js';
import { operationFail, operationId, operationPath } from './operacionContract.js';
export const estadosMesa = Object.freeze({ disponible: 'Disponible', ocupada: 'Ocupada', en_cobro: 'En cobro' });
export function adaptMesas(response) {
  if (!Array.isArray(response?.datos)) throw invalidResponse('mesas');
  return response.datos.map(row => {
    if (!row || typeof row.id !== 'string' || !Number.isInteger(row.numero) || !Object.hasOwn(estadosMesa, row.estado)) throw invalidResponse('mesas');
    return row;
  });
}
export async function listarMesas(options) {
  // No existe GET /mesas: reunir los tres estados reales del contrato.
  const lists = await Promise.all(Object.keys(estadosMesa).map(async estado => adaptMesas(await apiClient(`/mesas/estado/${estado}`, options))));
  return [...new Map(lists.flat().map(row => [row.id, row])).values()].sort((a, b) => a.numero - b.numero);
}
export async function cuentaMesa(id, options) {
  const row = (await apiClient(`/mesas/${operationPath(id)}/cuenta`, options))?.data;
  if (!row?.resumen || !Array.isArray(row.detalle_productos) || !Array.isArray(row.detalle_juegos)) throw invalidResponse('cuenta de mesa');
  return row;
}
export function trasladoBody(form) {
  const body = { mesa_origen_id: operationId(form.mesa_origen_id), mesa_destino_id: operationId(form.mesa_destino_id) };
  if (body.mesa_origen_id.toLowerCase() === body.mesa_destino_id.toLowerCase()) operationFail('Selecciona una mesa de destino diferente.');
  return body;
}
export async function trasladarMesa(form) {
  const response = await apiClient('/mesas/traslado', { method: 'POST', body: trasladoBody(form) });
  if (response?.exito !== true) throw invalidResponse('traslado de mesa');
  return response;
}
export async function cambiarEstadoMesa(id, estado) {
  if (!Object.hasOwn(estadosMesa, estado)) operationFail('Estado de mesa inválido.');
  const response = await apiClient(`/mesas/${operationPath(id)}/estado`, { method: 'PATCH', body: { estado } });
  if (typeof response?.mensaje !== 'string') throw invalidResponse('estado de mesa');
  return response;
}
