import { apiClient } from './apiClient.js';
import { operationId, operationPath, operationFail } from './operacionContract.js';
import { invalidResponse } from './catalogoContract.js';
export function participanteBody(form) {
  if (form.tipo_participante === 'registrado') return { tipo_participante: 'registrado', clientes_id: operationId(form.clientes_id) };
  if (form.tipo_participante !== 'temporal' || typeof form.nombre !== 'string' || !form.nombre.trim() || [...form.nombre.trim()].length > 100) operationFail('Nombre o alias obligatorio, máximo 100 caracteres.');
  return { tipo_participante: 'temporal', nombre: form.nombre.trim() };
}
function adapt(row) {
  if (!row || typeof row.id !== 'string' || typeof row.nombre !== 'string' || !['registrado', 'temporal'].includes(row.tipo_participante)) throw invalidResponse('participantes');
  return row;
}
export async function listarParticipantes(id, options) {
  const response = await apiClient(`/pedidos/${operationPath(id)}/participantes`, options);
  if (!Array.isArray(response?.datos)) throw invalidResponse('participantes');
  return response.datos.map(adapt);
}
export async function agregarParticipante(id, form) {
  return adapt((await apiClient(`/pedidos/${operationPath(id)}/participantes`, { method: 'POST', body: participanteBody(form) }))?.datos);
}
export async function listarParticipantesMesa(id, options) {
  const response = await apiClient(`/mesas/${operationPath(id)}/sesion-activa/participantes`, options);
  if (!Array.isArray(response?.datos) || !(response.sesion === null || typeof response.sesion?.id === 'string')) throw invalidResponse('visita de mesa');
  return { sesion: response.sesion, datos: response.datos.map(adapt) };
}
export async function agregarParticipanteMesa(id, form) {
  return adapt((await apiClient(`/mesas/${operationPath(id)}/sesion-activa/participantes`, { method: 'POST', body: participanteBody(form) }))?.datos);
}
export async function consumosParticipante(sesionId, participanteId, options) {
  const datos = (await apiClient(`/mesas/sesiones/${operationPath(sesionId)}/participantes/${operationPath(participanteId)}/consumos`, options))?.datos;
  if (!Array.isArray(datos?.items) || !Array.isArray(datos.resumen_productos) || typeof datos.total_consumido !== 'string' || datos.participante?.id !== participanteId || datos.sesion_mesa_id !== sesionId) throw invalidResponse('consumos del participante');
  return datos;
}
