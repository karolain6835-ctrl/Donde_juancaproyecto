import { apiClient, ApiError } from './apiClient.js';
import { readList, invalidResponse } from './catalogoContract.js';

export function adaptProveedor(row) {
  if (!row || typeof row.id !== 'string' || !row.id || !['activo', 'inactivo'].includes(row.estado) ||
      !['contacto_nombre', 'email', 'telefono'].every(key => row[key] === null || typeof row[key] === 'string')) throw invalidResponse('proveedores');
  return { id: row.id, contacto_nombre: row.contacto_nombre, email: row.email, telefono: row.telefono,
    nombre: row.contacto_nombre || row.email || row.telefono || row.id, estado: row.estado };
}
export function adaptProveedores(response) {
  return readList(response, 'proveedores').map(adaptProveedor);
}

// Fuente común del catálogo y del selector de Productos.
export async function listarProveedores(options) {
  return adaptProveedores(await apiClient('/proveedores', options));
}
export function proveedorBody(form) {
  const body = {};
  for (const [key, max] of [['contacto_nombre', 100], ['telefono', 20], ['email', 150]]) if (Object.hasOwn(form, key)) {
    const value = form[key];
    if (value !== null && (typeof value !== 'string' || value.length > max)) throw new ApiError(`${key} admite hasta ${max} caracteres.`, { code: 'VALIDATION_ERROR', status: 400 });
    body[key] = value === '' ? null : value;
  }
  if (Object.hasOwn(form, 'estado')) {
    if (!['activo', 'inactivo'].includes(form.estado)) throw new ApiError('Estado inválido.', { code: 'VALIDATION_ERROR', status: 400 });
    body.estado = form.estado;
  }
  if (!Object.keys(body).length) throw new ApiError('Envía al menos un campo para guardar.', { code: 'VALIDATION_ERROR', status: 400 });
  return body;
}
export async function crearProveedor(form) {
  return adaptProveedor((await apiClient('/proveedores', { method: 'POST', body: proveedorBody(form) }))?.datos);
}
export async function actualizarProveedor(id, form) {
  return adaptProveedor((await apiClient(`/proveedores/${encodeURIComponent(id)}`, { method: 'PUT', body: proveedorBody(form) }))?.datos);
}
