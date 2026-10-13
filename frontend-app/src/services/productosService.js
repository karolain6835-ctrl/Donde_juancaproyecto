import { apiClient, ApiError } from './apiClient.js';
import { readList, invalidResponse, numeric } from './catalogoContract.js';

export function adaptProductos(response) {
  return readList(response, 'productos').map(row => {
    if (!row || !['id', 'nombre', 'codigo', 'categoria_nombre', 'proveedores_id'].every(key =>
      typeof row[key] === 'string' && row[key].trim()) || !['activo', 'inactivo'].includes(row.estado) ||
      !(row.historial_costos_id === null || (typeof row.historial_costos_id === 'string' && row.historial_costos_id.trim())) ||
      !Number.isInteger(Number(row.categorias_id)) || Number(row.categorias_id) <= 0) throw invalidResponse('productos');
    const stock = numeric(row.cantidad_disponible, 'productos');
    const minimo = numeric(row.stock_minimo, 'productos');
    if (!Number.isInteger(stock) || !Number.isInteger(minimo)) throw invalidResponse('productos');
    return {
      id: row.id, nombre: row.nombre, codigo: row.codigo, categoria: row.categoria_nombre,
      stock, minimo, costo: numeric(row.costo_promedio_ponderado, 'productos'),
      precio: numeric(row.precio_venta, 'productos'), activo: row.estado === 'activo',
      estadoStock: stock <= 0 ? 'agotado' : stock <= minimo ? 'bajo' : 'normal',
      categorias_id: String(row.categorias_id), proveedores_id: row.proveedores_id,
      historial_costos_id: row.historial_costos_id,
    };
  });
}

export function productoBody(form, editing = false) {
  const fail = message => { throw new ApiError(message, { status: 400, code: 'VALIDATION_ERROR' }); };
  const nombre = typeof form.nombre === 'string' ? form.nombre.trim() : '';
  const codigo = typeof form.codigo === 'string' ? form.codigo.trim() : '';
  if (!nombre || !codigo) fail('Nombre y código son obligatorios.');
  if (nombre.length > 150 || codigo.length > 50) fail('Nombre o código exceden la longitud permitida.');
  if (!['number', 'string'].includes(typeof form.precio_venta) || String(form.precio_venta).trim() === '') fail('El precio de venta debe ser mayor que 0.');
  const precio = Number(form.precio_venta);
  if (!Number.isFinite(precio) || precio <= 0) fail('El precio de venta debe ser un número finito mayor que 0.');
  if (!Number.isInteger(Number(form.categorias_id)) || Number(form.categorias_id) <= 0 ||
      typeof form.proveedores_id !== 'string' || !form.proveedores_id.trim()) fail('Selecciona una categoría y un proveedor reales.');
  const entero = (value, label) => {
    if (!['number', 'string'].includes(typeof value) || String(value).trim() === '') fail(`${label} es obligatorio.`);
    const n = Number(value);
    if (!Number.isSafeInteger(n) || n < 0 || n > 2147483647) fail(`${label} debe ser un entero no negativo dentro del rango permitido.`);
    return n;
  };
  const body = { nombre, codigo, precio_venta: precio, stock_minimo: entero(form.stock_minimo, 'Stock mínimo'),
    categorias_id: form.categorias_id, proveedores_id: form.proveedores_id };
  if (editing) {
    if (!['activo', 'inactivo'].includes(form.estado)) fail('Estado de producto inválido.');
    body.estado = form.estado;
  } else body.cantidad = entero(form.cantidad, 'Cantidad inicial');
  return body;
}

export async function listarProductos(options) {
  return adaptProductos(await apiClient('/productos', options));
}
export async function crearProducto(form) {
  const response = await apiClient('/productos', { method: 'POST', body: productoBody(form) });
  if (!response || typeof response.id_producto !== 'string' || !response.id_producto) throw invalidResponse('creación de producto');
  return response;
}
export async function actualizarProducto(id, form) {
  const response = await apiClient(`/productos/${encodeURIComponent(id)}`, { method: 'PUT', body: productoBody(form, true) });
  if (!response || typeof response.mensaje !== 'string') throw invalidResponse('actualización de producto');
  return response;
}
export async function eliminarProducto(id) {
  const response = await apiClient(`/productos/${encodeURIComponent(id)}`, { method: 'DELETE' });
  if (!response || typeof response.mensaje !== 'string') throw invalidResponse('eliminación de producto');
  return response;
}
