import { ApiError } from './apiClient.js';

export function invalidResponse(resource) {
  return new ApiError(`El servidor devolvió una respuesta de ${resource} inválida.`, { code: 'INVALID_RESPONSE' });
}

export function readList(response, resource) {
  if (!response || !Array.isArray(response.datos)) throw invalidResponse(resource);
  return response.datos;
}

export function numeric(value, resource) {
  if ((typeof value !== 'number' && typeof value !== 'string') ||
      (typeof value === 'string' && !value.trim()) || !Number.isFinite(Number(value))) throw invalidResponse(resource);
  return Number(value);
}
