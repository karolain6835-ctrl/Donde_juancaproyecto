import {apiClient, ApiError} from './apiClient.js';
const patron=/^\/uploads\/productos\/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\.webp$/;
export function imagenProductoUrl(ruta) {
  if(typeof ruta!=='string'||!patron.test(ruta))return null;
  return new URL(ruta,import.meta.env?.VITE_API_URL||'http://localhost:5000/api').href;
}
export function validarImagenProducto(file) {
  if(!file||!['image/jpeg','image/png','image/webp'].includes(file.type))return 'Elige una imagen JPG, PNG o WebP.';
  if(file.size>5*1024*1024)return 'La imagen supera el máximo de 5 MB.';
  return '';
}
export async function subirImagenProducto(id,file) {
  const error=validarImagenProducto(file);if(error)throw new ApiError(error,{status:400,code:'VALIDATION_ERROR'});
  const body=new FormData();body.append('imagen',file);
  const r=await apiClient(`/productos/${encodeURIComponent(id)}/imagen`,{method:'PUT',body});
  if(!imagenProductoUrl(r?.datos?.imagen_url))throw new ApiError('No fue posible confirmar la imagen guardada.');
  return r;
}
export async function eliminarImagenProducto(id) {
  const r=await apiClient(`/productos/${encodeURIComponent(id)}/imagen`,{method:'DELETE'});
  if(r?.datos?.imagen_url!==null)throw new ApiError('No fue posible confirmar la eliminación de la imagen.');
  return r;
}
