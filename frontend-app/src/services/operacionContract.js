import { ApiError } from './apiClient.js';
export const operationFail = message => { throw new ApiError(message, { status: 400, code: 'VALIDATION_ERROR' }); };
export function operationId(value) {
  if (typeof value !== 'string' || !value.trim() || value !== value.trim() || value.length > 36) operationFail('Selecciona una referencia real.');
  return value;
}
export const operationPath = value => encodeURIComponent(operationId(value));
export async function sincronizarOperacion(operation, refreshers) {
  const response = await operation();
  await Promise.all(refreshers.map(refresh => refresh()));
  return response;
}
