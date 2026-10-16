import { apiClient, ApiError } from './apiClient.js';
import { readList, invalidResponse } from './catalogoContract.js';

/** Valida la lista y sus metadatos de paginación, y adapta cada registro. */
export function paginated(response, resource, adapt) {
  const rows = readList(response, resource);
  const page = response.paginacion;
  if (!page || !Number.isSafeInteger(page.pagina) || page.pagina < 1 || !Number.isSafeInteger(page.limite) || page.limite < 1 ||
      !Number.isSafeInteger(page.total) || page.total < 0 || !Number.isSafeInteger(page.total_paginas) || page.total_paginas < 0) throw invalidResponse(resource);
  return { datos: rows.map(adapt), paginacion: page };
}
/** Serializa filtros y paginación omitiendo valores vacíos. */
export function queryString(values) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) if (value !== undefined && value !== null && value !== '') params.set(key, String(value));
  return params.toString();
}
/** Valida el formato del identificador antes de enviarlo a la API. */
export function inventoryId(value, label) {
  if (typeof value !== 'string' || !value || value.length > 36 || value !== value.trim()) throw new ApiError(`Selecciona ${label} válido.`, { status: 400, code: 'VALIDATION_ERROR' });
  return value;
}
/** Convierte la cantidad a entero y comprueba el rango permitido. */
export function inventoryQuantity(value, minimum = 0) {
  if (!['number', 'string'].includes(typeof value) || String(value).trim() === '' ||
      !Number.isInteger(Number(value)) || Number(value) < minimum || Number(value) > 2147483647) throw new ApiError(`La cantidad debe ser un entero entre ${minimum} y 2147483647.`, { status: 400, code: 'VALIDATION_ERROR' });
  return Number(value);
}
/** Valida tipos y cantidades de los movimientos en la respuesta paginada. */
export function adaptMovimientos(response) {
  return paginated(response, 'movimientos', row => {
    if (!row || typeof row.id !== 'string' || !['compra','venta','merma','ajuste'].includes(row.tipo) ||
        !['cantidad','stock_antes','stock_despues'].every(key => Number.isInteger(row[key]))) throw invalidResponse('movimientos');
    return { ...row };
  });
}
/** Consulta movimientos paginados con filtros por tipo y producto. */
export async function listarMovimientos({ pagina = 1, limite = 20, tipo, producto_id } = {}, options) {
  return adaptMovimientos(await apiClient(`/inventario/movimientos?${queryString({ pagina, limite, tipo, producto_id })}`, options));
}
/** Construye el cuerpo del ajuste con un producto y una cantidad validados. */
export function ajusteBody(form) {
  return { producto_id: inventoryId(form.producto_id, 'un producto'), nueva_cantidad: inventoryQuantity(form.nueva_cantidad) };
}
/** Envía la nueva cantidad y valida el stock confirmado por el servidor. */
export async function ajustarStock(form) {
  const response = await apiClient('/inventario/actualizar-stock', { method: 'PUT', body: ajusteBody(form) });
  if (!response || typeof response.mensaje !== 'string' || !['stock_anterior','stock_actual','diferencia'].every(key => Number.isInteger(response[key]))) throw invalidResponse('ajuste de stock');
  return response;
}

// Reconsultar únicamente tras confirmación del servidor; no hay stock optimista.
export async function stockMutation(operation, refresh) {
  const response = await operation();
  await refresh();
  return response;
}
