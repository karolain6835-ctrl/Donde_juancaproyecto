import { apiClient, ApiError } from './apiClient.js';
import { invalidResponse } from './catalogoContract.js';
import { parseCOPInput } from '../utils/copInput.js';

export const estadosCompra = Object.freeze({ pendiente: 'Pendiente', parcialmente_recibida: 'Parcialmente recibida', recibida: 'Recibida', cancelada: 'Cancelada', cerrada_parcial: 'Cerrada parcialmente' });
const fail = message => { throw new ApiError(message, { status: 400, code: 'VALIDATION_ERROR' }); };
const id = value => {
  if (typeof value !== 'string' || !value.trim() || value !== value.trim() || value.length > 36) fail('Selecciona una referencia válida.');
  return value;
};
const quantity = value => {
  if (!['string', 'number'].includes(typeof value) || String(value).trim() === '' || !Number.isInteger(Number(value)) || Number(value) <= 0 || Number(value) > 2147483647) fail('La cantidad debe ser un entero mayor que cero dentro del rango permitido.');
  return Number(value);
};
export function compraBody(form) {
  if (!Array.isArray(form.items) || !form.items.length) fail('Agrega al menos un producto.');
  const seen = new Set();
  const items = form.items.map(item => {
    const productos_id = id(item.productos_id);
    if (seen.has(productos_id.toLowerCase())) fail('No repitas productos en la compra.');
    seen.add(productos_id.toLowerCase());
    const precio_unitario = parseCOPInput(item.costo);
    if (precio_unitario <= 0 || precio_unitario > 99999999.99) fail('El costo unitario debe ser mayor que cero y no superar 99.999.999,99.');
    return { productos_id, cantidad: quantity(item.cantidad), precio_unitario };
  });
  return { proveedores_id: id(form.proveedores_id), items };
}
export function pendienteItem(item) {
  return item.cantidad_pendiente ?? (item.cantidad_recibida === null ? item.cantidad : 0);
}
export function recepcionBody(compra, cantidades) {
  if (!['pendiente', 'parcialmente_recibida'].includes(compra.estado)) fail('La compra no admite nuevas recepciones.');
  const items = compra.items.flatMap(item => {
    const pendiente = pendienteItem(item);
    const raw = cantidades === undefined ? pendiente : cantidades[item.id];
    if (raw === undefined || raw === '' || raw === '0' || raw === 0) return [];
    const cantidad_recibida = quantity(raw);
    if (cantidad_recibida > pendiente) fail('La recepción supera la cantidad pendiente.');
    return [{ compra_item_id: id(item.id), cantidad_recibida }];
  });
  if (!items.length) fail('Indica al menos una cantidad pendiente para recibir.');
  return { items };
}
export function motivoBody(motivo) {
  if (typeof motivo !== 'string' || !motivo.trim() || [...motivo].length > 500) fail('Indica un motivo de hasta 500 caracteres.');
  return { motivo: motivo.trim() };
}
// La misma operación conserva su clave incluso si se pierde la respuesta HTTP.
export function crearIntentoRecepcion(keyFactory = () => crypto.randomUUID()) {
  const keys = new Map();
  return { key(compraId, body) {
    const fingerprint = JSON.stringify([compraId, [...body.items].sort((a, b) => a.compra_item_id.localeCompare(b.compra_item_id))]);
    if (!keys.has(fingerprint)) keys.set(fingerprint, keyFactory());
    return keys.get(fingerprint);
  }, clear() { keys.clear(); } };
}
function compra(row) {
  if (!row || typeof row.id !== 'string' || !Object.hasOwn(estadosCompra, row.estado) || !['total_estimado', 'total_recibido'].every(k => row[k] !== null && Number.isFinite(Number(row[k]))) || !['legado', 'v2'].includes(row.modelo_recepcion)) throw invalidResponse('compras');
  return row;
}
function list(response, adapt) {
  if (!Array.isArray(response?.datos) || !response.paginacion || !Number.isInteger(response.paginacion.pagina) || !Number.isFinite(Number(response.paginacion.total))) throw invalidResponse('compras');
  return { ...response, datos: response.datos.map(adapt) };
}
function recepcion(row) {
  if (!row || typeof row.id !== 'string' || !['confirmada', 'reversada'].includes(row.estado) || !Array.isArray(row.items)) throw invalidResponse('recepciones');
  return row;
}
function query(values) {
  return new URLSearchParams(Object.entries(values).filter(([, value]) => value !== undefined && value !== '')).toString();
}
const path = compraId => `/compras/${encodeURIComponent(id(compraId))}`;
export async function listarCompras({ pagina = 1, limite = 20, estado, proveedores_id } = {}, options) {
  return list(await apiClient(`/compras?${query({ pagina, limite, estado, proveedores_id })}`, options), compra);
}
export async function detalleCompra(compraId, options) {
  const row = compra((await apiClient(path(compraId), options))?.datos);
  if (!Array.isArray(row.items)) throw invalidResponse('detalle de compra');
  return row;
}
export async function crearCompra(form) {
  const response = await apiClient('/compras', { method: 'POST', body: compraBody(form) });
  compra(response?.datos); return response;
}
export async function recibirCompra(compraId, body, key) {
  const response = await apiClient(`${path(compraId)}/recibir`, { method: 'PATCH', body, headers: { 'Idempotency-Key': key } });
  compra(response?.datos); recepcion(response?.recepcion); return response;
}
export async function listarRecepciones(compraId, { pagina = 1, limite = 20 } = {}, options) {
  return list(await apiClient(`${path(compraId)}/recepciones?${query({ pagina, limite })}`, options), recepcion);
}
export async function detalleRecepcion(compraId, recepcionId, options) {
  return recepcion((await apiClient(`${path(compraId)}/recepciones/${encodeURIComponent(id(recepcionId))}`, options))?.recepcion);
}
export async function reversarRecepcion(compraId, recepcionId, motivo) {
  const response = await apiClient(`${path(compraId)}/recepciones/${encodeURIComponent(id(recepcionId))}/reversar`, { method: 'PATCH', body: motivoBody(motivo) });
  compra(response?.datos); recepcion(response?.recepcion); return response;
}
export async function cancelarPendiente(compraId, motivo) {
  const response = await apiClient(`${path(compraId)}/cancelar-pendiente`, { method: 'PATCH', body: motivoBody(motivo) });
  compra(response?.datos); return response;
}
export async function sincronizarCompra(operation, refreshers) {
  const response = await operation();
  await Promise.all(refreshers.map(refresh => refresh()));
  return response;
}
