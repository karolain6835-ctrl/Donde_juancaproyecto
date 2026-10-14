import { apiClient } from './apiClient.js';
import { readList, invalidResponse } from './catalogoContract.js';
import { paginated, queryString, inventoryId, inventoryQuantity } from './inventarioService.js';

export function adaptMermas(response) {
  return paginated(response, 'mermas', row => {
    if (!row || typeof row.id !== 'string' || !Number.isInteger(row.cantidad) || row.cantidad <= 0 ||
        typeof row.valor_economico !== 'string' || !/^\d+\.\d{2}$/.test(row.valor_economico)) throw invalidResponse('mermas');
    return { ...row };
  });
}
export async function listarMermas({ pagina = 1, limite = 20, producto_id, motivo_id } = {}, options) {
  return adaptMermas(await apiClient(`/mermas?${queryString({ pagina, limite, producto_id, motivo_id })}`, options));
}
export async function listarMotivos(options) {
  return readList(await apiClient('/mermas/motivos', options), 'motivos').map(row => {
    if (!row || typeof row.id !== 'string' || !row.id || typeof row.nombre !== 'string') throw invalidResponse('motivos');
    return { id: row.id, nombre: row.nombre };
  });
}
export async function listarRefrigeradoresMerma(options) {
  return readList(await apiClient('/mermas/refrigeradores', options), 'refrigeradores').map(row => {
    if (!row || typeof row.id !== 'string' || !row.id || typeof row.nombre !== 'string' ||
        !['activa', 'mantenimiento', 'apagada'].includes(row.estado)) throw invalidResponse('refrigeradores');
    return { id: row.id, nombre: row.nombre, estado: row.estado };
  });
}
export function mermaBody(form) {
  return { productos_id: inventoryId(form.productos_id, 'un producto'), cantidad: inventoryQuantity(form.cantidad, 1),
    merma_motivos_id: inventoryId(form.merma_motivos_id, 'un motivo'), refrigeradores_id: inventoryId(form.refrigeradores_id, 'un refrigerador') };
}
export async function registrarMerma(form) {
  const response = await apiClient('/mermas', { method: 'POST', body: mermaBody(form) });
  if (!response?.datos || typeof response.datos.id !== 'string' || !Number.isInteger(response.datos.stock_actual)) throw invalidResponse('registro de merma');
  return response;
}
