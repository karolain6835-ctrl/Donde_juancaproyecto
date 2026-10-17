import { apiClient, ApiError } from './apiClient.js';
import { readList, invalidResponse } from './catalogoContract.js';
import {operationPath} from './operacionContract.js';
import {centavosDivision} from './divisionesService.js';

export async function historialCliente(id,{pagina=1,limite=20}={},options){
 const r=await apiClient(`/clientes/${operationPath(id)}/historial?${new URLSearchParams({pagina,limite})}`,options);
 if(typeof r?.cliente?.id!=='string'||r.cliente.id!==id||!Array.isArray(r.datos)||!Number.isSafeInteger(r.paginacion?.total)||!Number.isSafeInteger(r.paginacion?.pagina)||!Number.isSafeInteger(r.paginacion?.total_paginas))throw invalidResponse('historial de clientes');
 for(const row of r.datos){if(typeof row.id!=='string'||typeof row.fecha!=='string'||typeof row.total_definitivo!=='boolean')throw invalidResponse('historial de clientes');for(const key of ['total_pedido','consumo_cliente','pagos_atribuidos'])centavosDivision(row[key]);}
 return r;
}

export function adaptCliente(row) {
  if (!row || typeof row.id !== 'string' || !row.id || typeof row.nombre !== 'string' || !row.nombre.trim() ||
      !['activo', 'inactivo'].includes(row.estado) ||
      !['email', 'telefono'].every(key => row[key] === null || typeof row[key] === 'string')) throw invalidResponse('clientes');
  return { id: row.id, nombre: row.nombre, email: row.email, telefono: row.telefono, estado: row.estado };
}
export function adaptClientes(response) {
  const rows = readList(response, 'clientes');
  if (!Number.isSafeInteger(response.pagina) || response.pagina < 1 || !Number.isSafeInteger(response.limite) ||
      response.limite < 1 || response.limite > 100 || !Number.isSafeInteger(response.total) || response.total < 0) throw invalidResponse('clientes');
  return { datos: rows.map(adaptCliente), pagina: response.pagina, limite: response.limite, total: response.total };
}
export function clienteBody(form, editing = false) {
  const fail = message => { throw new ApiError(message, { code: 'VALIDATION_ERROR', status: 400 }); };
  const body = {};
  if (!editing || Object.hasOwn(form, 'nombre')) {
    if (typeof form.nombre !== 'string' || !form.nombre.trim() || [...form.nombre].length > 100) fail('Nombre es obligatorio y admite hasta 100 caracteres.');
    body.nombre = form.nombre.trim();
  }
  for (const [key, max] of [['email', 150], ['telefono', 20]]) if (Object.hasOwn(form, key)) {
    const value = form[key];
    if (value !== null && (typeof value !== 'string' || [...value].length > max)) fail(`${key} admite hasta ${max} caracteres.`);
    const text = value?.trim() || null;
    if (key === 'email' && text && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) fail('Formato de email inválido.');
    body[key] = text;
  }
  if (editing && Object.hasOwn(form, 'estado')) {
    if (!['activo', 'inactivo'].includes(form.estado)) fail('Estado inválido.');
    body.estado = form.estado;
  }
  if (!Object.keys(body).length) fail('Envía al menos un campo para actualizar.');
  return body;
}
export async function listarClientes({ pagina = 1, limite = 20, buscar = '', estado = 'todos' } = {}, options) {
  const query = new URLSearchParams({ pagina: String(pagina), limite: String(limite) });
  if (buscar.trim()) query.set('buscar', buscar.trim());
  if (estado !== 'todos') query.set('estado', estado);
  return adaptClientes(await apiClient(`/clientes?${query}`, options));
}
export async function crearCliente(form) {
  return adaptCliente((await apiClient('/clientes/registrar', { method: 'POST', body: clienteBody(form) }))?.cliente);
}
export async function actualizarCliente(id, form) {
  return adaptCliente((await apiClient(`/clientes/${encodeURIComponent(id)}`, { method: 'PUT', body: clienteBody(form, true) }))?.cliente);
}
