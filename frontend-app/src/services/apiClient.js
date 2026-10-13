const API_URL = (import.meta.env?.VITE_API_URL || 'http://localhost:5000/api').replace(/\/+$/, '');
let unauthorizedHandler = null;

export function configureUnauthorizedHandler(handler) {
  unauthorizedHandler = handler;
  return () => {
    if (unauthorizedHandler === handler) unauthorizedHandler = null;
  };
}

export class ApiError extends Error {
  constructor(message, { status = null, code = 'HTTP_ERROR', data = null, cause } = {}) {
    super(message, { cause });
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.data = data;
  }
}

export async function apiClient(path, { method = 'GET', body, headers, auth = true, ...options } = {}) {
  let token = null;
  if (auth) {
    try { token = localStorage.getItem('dondejuanca_token'); } catch { /* Sin token disponible. */ }
  }
  const requestHeaders = new Headers(headers);
  if (token) requestHeaders.set('Authorization', `Bearer ${token}`);
  const isJson = body !== undefined && body !== null &&
    (Array.isArray(body) || Object.prototype.toString.call(body) === '[object Object]');
  if (isJson && !requestHeaders.has('Content-Type')) requestHeaders.set('Content-Type', 'application/json');

  let response;
  try {
    response = await fetch(`${API_URL}/${path.replace(/^\/+/, '')}`, {
      ...options, method, headers: requestHeaders,
      body: isJson ? JSON.stringify(body) : body,
    });
  } catch (cause) {
    throw new ApiError('No se pudo conectar con el servidor. Intenta nuevamente.', {
      code: cause.name === 'AbortError' ? 'ABORTED' : 'NETWORK_ERROR', cause,
    });
  }

  // No depender del Content-Type: tolerar JSON, HTML de error y respuestas vacías.
  let data = null;
  try {
    const text = await response.text();
    if (text.trim()) {
      try { data = JSON.parse(text); } catch { /* Un body no JSON no se muestra como HTML en la UI. */ }
    }
  } catch (cause) {
    if (response.ok) throw new ApiError('No se pudo leer la respuesta del servidor.', { code: 'NETWORK_ERROR', cause });
  }
  if (!response.ok) {
    const code = response.status === 401 ? 'UNAUTHORIZED' : response.status === 403 ? 'FORBIDDEN' : 'HTTP_ERROR';
    const message = typeof data?.error === 'string' ? data.error :
      typeof data?.mensaje === 'string' ? data.mensaje : `Error HTTP ${response.status}.`;
    if (auth && response.status === 401) {
      // Una respuesta antigua no debe cerrar una sesión iniciada posteriormente.
      let currentToken = null;
      try { currentToken = localStorage.getItem('dondejuanca_token'); } catch { /* Sin almacenamiento. */ }
      if (currentToken === token) unauthorizedHandler?.();
    }
    throw new ApiError(message, { status: response.status, code, data });
  }
  return data;
}
