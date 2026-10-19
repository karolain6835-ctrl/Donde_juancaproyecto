import { apiClient } from './apiClient.js';
import { invalidResponse } from './catalogoContract.js';
export async function listarResponsables(options) {
  const response = await apiClient('/usuarios/responsables', options);
  if (!Array.isArray(response?.datos) || response.datos.some(row => !row || typeof row.id !== 'string' || !(row.nombre === null || typeof row.nombre === 'string') || row.estado !== 'activo')) throw invalidResponse('responsables');
  return response.datos;
}
