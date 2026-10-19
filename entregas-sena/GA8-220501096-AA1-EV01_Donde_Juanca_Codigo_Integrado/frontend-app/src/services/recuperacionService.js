import {apiClient} from './apiClient.js';

// Estas operaciones son públicas: no adjuntar JWT ni modificar una sesión existente.
export const solicitarRecuperacion = correo => apiClient('/usuarios/recuperacion/solicitar', {method: 'POST', auth: false, body: {correo}});
export const verificarRecuperacion = (correo, codigo) => apiClient('/usuarios/recuperacion/verificar', {method: 'POST', auth: false, body: {correo, codigo}});
export const restablecerPassword = (token, nueva, confirmar) => apiClient('/usuarios/recuperacion/restablecer', {method: 'POST', auth: false,
  body: {token_recuperacion: token, nueva_contrasena: nueva, confirmar_contrasena: confirmar}});

export function validarPasswordRecuperacion(nueva, confirmar) {
  if (!nueva.trim() || !confirmar.trim() || new TextEncoder().encode(nueva).length > 72 || new TextEncoder().encode(confirmar).length > 72) return 'La contraseña es obligatoria y admite máximo 72 bytes.';
  if (nueva !== confirmar) return 'La confirmación no coincide con la nueva contraseña.';
  return '';
}
