import { ApiError, apiRequest } from './api';

export type User = { id: string; nombre: string; correo: string; rol: string; estado: 'activo' };
export type Session = { token: string; expiresAt: number; api: string };
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);

export function parseSession(value: unknown): Session {
  if (!object(value) || typeof value.token !== 'string' || !/^[\w-]+\.[\w-]+\.[\w-]+$/.test(value.token) ||
      typeof value.expiresAt !== 'number' || !Number.isSafeInteger(value.expiresAt) || typeof value.api !== 'string') {
    throw new ApiError('La sesión recibida no es válida.');
  }
  return { token: value.token, expiresAt: value.expiresAt, api: value.api };
}

export async function currentUser(token: string): Promise<User> {
  const data = await apiRequest('/api/usuarios/me', { token });
  const u = object(data) ? data.usuario : null;
  if (!object(u) || typeof u.id !== 'string' || !u.id || typeof u.nombre !== 'string' || !u.nombre.trim() ||
      typeof u.correo !== 'string' || typeof u.rol !== 'string' || u.estado !== 'activo') throw new ApiError('No se pudo validar tu identidad.');
  if (u.rol !== 'Mesera') throw new ApiError('Esta aplicación está habilitada únicamente para el rol Mesera.', 403);
  return { id: u.id, nombre: u.nombre, correo: u.correo, rol: u.rol, estado: u.estado };
}

export async function authenticate(correo: string, contrasena: string, api: string): Promise<{ session: Session; user: User }> {
  const startedAt = Date.now();
  const data = await apiRequest('/api/usuarios/login', { body: { correo: correo.trim(), contrasena } });
  if (!object(data) || data.token_type !== 'Bearer' || !Number.isSafeInteger(data.expires_in) ||
      (data.expires_in as number) <= 0 || !object(data.usuario) || typeof data.usuario.id !== 'string') {
    throw new ApiError('La respuesta de inicio de sesión no es válida.');
  }
  const session = parseSession({ token: data.token, expiresAt: startedAt + (data.expires_in as number) * 1000, api });
  const user = await currentUser(session.token);
  if (user.id !== data.usuario.id) throw new ApiError('La identidad recibida no coincide con la sesión.');
  return { session, user };
}
