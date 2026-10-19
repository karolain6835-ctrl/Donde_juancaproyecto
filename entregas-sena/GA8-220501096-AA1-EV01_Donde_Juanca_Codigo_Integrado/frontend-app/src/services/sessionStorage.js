const TOKEN_KEY = 'dondejuanca_token';
const USER_KEY = 'dondejuanca_usuario';

export function isUsableSession(token, user) {
  return typeof token === 'string' && /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token) &&
    user !== null && typeof user === 'object' && !Array.isArray(user) &&
    typeof user.id === 'string' && Boolean(user.id.trim());
}

export function clearSession() {
  // Intentar ambas claves incluso si el navegador bloquea una operación.
  for (const key of [TOKEN_KEY, USER_KEY]) {
    try { localStorage.removeItem(key); } catch { /* La sesión en memoria se limpia igualmente. */ }
  }
}

export function readSession() {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    const rawUser = localStorage.getItem(USER_KEY);
    if (!token && !rawUser) return { token: null, user: null };
    const user = JSON.parse(rawUser);
    if (isUsableSession(token, user)) return { token, user };
  } catch { /* Un almacenamiento inaccesible o corrupto no autentica al usuario. */ }
  clearSession();
  return { token: null, user: null };
}

export function saveSession(token, user) {
  if (!isUsableSession(token, user)) throw new Error('Sesión inválida.');
  try {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    localStorage.setItem(TOKEN_KEY, token);
  } catch (error) {
    clearSession();
    throw error;
  }
}
