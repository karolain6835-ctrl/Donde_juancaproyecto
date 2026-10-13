import { apiClient } from './apiClient.js';
import { readList, invalidResponse } from './catalogoContract.js';

export function adaptCategorias(response) {
  return readList(response, 'categorías').map(row => {
    if (!row || !Number.isInteger(Number(row.id)) || Number(row.id) <= 0 ||
        typeof row.nombre !== 'string' || !row.nombre.trim() ||
        (row.descripcion !== null && typeof row.descripcion !== 'string') ||
        ![null, 0, 1, '0', '1', false, true].includes(row.activo)) throw invalidResponse('categorías');
    return { id: String(row.id), nombre: row.nombre, descripcion: row.descripcion ?? '', activo: Number(row.activo) === 1 };
  });
}

export async function listarCategorias(options) {
  return adaptCategorias(await apiClient('/categorias', options));
}
