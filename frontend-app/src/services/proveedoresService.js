import { apiClient } from './apiClient.js';
import { readList, invalidResponse } from './catalogoContract.js';

// Solo lectura para el selector de producto; no integra el módulo de proveedores.
export async function listarProveedores(options) {
  return readList(await apiClient('/proveedores', options), 'proveedores').map(row => {
    if (!row || typeof row.id !== 'string' || !row.id ||
        !['activo', 'inactivo'].includes(row.estado) ||
        (row.contacto_nombre !== null && typeof row.contacto_nombre !== 'string')) throw invalidResponse('proveedores');
    return { id: row.id, nombre: row.contacto_nombre || row.email || row.telefono || row.id, estado: row.estado };
  });
}
