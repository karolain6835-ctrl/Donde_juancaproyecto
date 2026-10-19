export class ApiError extends Error {
  constructor(message: string, public status = 0) { super(message); }
}

export function apiBaseUrl() {
  // Expo sustituye este acceso directo al empaquetar; no usar destructuring ni env[nombre].
  const value = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (!value) throw new ApiError('Configura EXPO_PUBLIC_API_URL en mobile/.env.local.');
  let url: URL;
  try { url = new URL(value); } catch { throw new ApiError('La dirección de la API no es válida.'); }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash || url.pathname !== '/') {
    throw new ApiError('La URL debe contener solo el origen de Express, sin /api ni credenciales.');
  }
  if (['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) throw new ApiError('Usa la IP local del computador, no localhost.');
  const localPreview = process.env.EXPO_PUBLIC_LOCAL_API_ALLOWED === 'true' && url.origin === 'http://192.168.2.232:5000';
  if (!__DEV__ && url.protocol !== 'https:' && !localPreview) throw new ApiError('La API debe usar HTTPS fuera de desarrollo.');
  return url.origin;
}

export async function apiRequest(path: string, options: { token?: string; body?: unknown } = {}): Promise<unknown> {
  const base = apiBaseUrl();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(`${base}${path}`, {
      method: options.body === undefined ? 'GET' : 'POST',
      headers: { Accept: 'application/json', ...(options.body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}) },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: controller.signal,
      redirect: 'error',
    });
    // No mostrar cuerpos arbitrarios ni registrar credenciales o respuestas.
    if (!response.ok) {
      const messages: Record<number, string> = {
        400: 'Revisa los datos enviados.', 401: options.token ? 'Tu sesión venció o dejó de ser válida.' : 'Correo o contraseña incorrectos.',
        403: 'Tu cuenta no tiene acceso o está inactiva.', 429: 'Demasiados intentos. Espera antes de volver a intentar.',
      };
      throw new ApiError(messages[response.status] ?? 'El servidor no pudo completar la solicitud. Intenta nuevamente.', response.status);
    }
    try { return await response.json(); } catch { throw new ApiError('La API devolvió una respuesta no válida.'); }
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(controller.signal.aborted ? 'La conexión tardó demasiado. Intenta nuevamente.' : 'No pudimos conectar con la API. Revisa la red y la dirección del servidor.');
  } finally { clearTimeout(timeout); }
}
