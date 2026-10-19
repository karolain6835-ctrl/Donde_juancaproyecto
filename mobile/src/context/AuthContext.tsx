import { createContext, useCallback, useContext, useEffect, useRef, useState, type PropsWithChildren } from 'react';
import { AppState } from 'react-native';
import { ApiError, apiBaseUrl } from '../services/api';
import { authenticate, currentUser, type Session, type User } from '../services/auth';
import { deleteSession, readSession, saveSession } from '../services/sessionStore';

type Auth = { user: User | null; ready: boolean; busy: boolean; notice: string; login: (email: string, password: string) => Promise<void>; logout: () => Promise<void> };
const Context = createContext<Auth | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const session = useRef<Session | null>(null);
  const lock = useRef(false);
  const generation = useRef(0);

  const clear = useCallback(async (message = '') => {
    generation.current++;
    session.current = null;
    setUser(null);
    setNotice(message);
    try { await deleteSession(); }
    catch { setNotice('No se pudo borrar la sesión guardada. Reintenta cerrar sesión antes de salir de la aplicación.'); }
  }, []);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const saved = await readSession();
        if (saved) {
          if (saved.expiresAt <= Date.now() || saved.api !== apiBaseUrl()) throw new ApiError('Inicia sesión nuevamente.');
          const identity = await currentUser(saved.token);
          if (saved.expiresAt <= Date.now()) throw new ApiError('Tu sesión venció.');
          if (active) { session.current = saved; setUser(identity); }
        }
      } catch { if (active) await clear('No pudimos restaurar la sesión. Inicia sesión nuevamente.'); }
      finally { if (active) setReady(true); }
    })();
    return () => { active = false; };
  }, [clear]);

  useEffect(() => {
    if (!user || !session.current) return;
    const expire = () => { void clear('Tu sesión venció. Inicia sesión nuevamente.'); };
    const timer = setTimeout(expire, Math.min(Math.max(0, session.current.expiresAt - Date.now()), 2147483647));
    const subscription = AppState.addEventListener('change', state => {
      if (state !== 'active' || !session.current) return;
      const saved = session.current;
      const version = generation.current;
      setUser(null); // Ocultar el panel hasta confirmar otra vez la identidad en el servidor.
      setReady(false);
      void (async () => {
        try {
          if (saved.expiresAt <= Date.now()) throw new ApiError('Tu sesión venció.');
          const identity = await currentUser(saved.token);
          if (saved.expiresAt <= Date.now()) throw new ApiError('Tu sesión venció.');
          if (version === generation.current) setUser(identity);
        } catch (error) { if (version === generation.current) await clear(error instanceof ApiError ? error.message : 'Inicia sesión nuevamente.'); }
        finally { setReady(true); }
      })();
    });
    return () => { clearTimeout(timer); subscription.remove(); };
  }, [user, clear]);

  async function login(email: string, password: string) {
    if (lock.current || !ready) return;
    lock.current = true; setBusy(true); setNotice('');
    try {
      await deleteSession();
      const { session: saved, user: identity } = await authenticate(email, password, apiBaseUrl());
      if (saved.expiresAt <= Date.now()) throw new ApiError('Tu sesión venció. Intenta nuevamente.');
      await saveSession(saved);
      session.current = saved; generation.current++; setUser(identity);
    } catch (error) {
      await clear();
      throw error instanceof ApiError ? error : new ApiError('No se pudo guardar la sesión de forma segura. Intenta nuevamente.');
    } finally { lock.current = false; setBusy(false); }
  }

  async function logout() {
    if (lock.current) return;
    lock.current = true; setBusy(true);
    try { await clear(); } finally { lock.current = false; setBusy(false); }
  }
  return <Context.Provider value={{ user, ready, busy, notice, login, logout }}>{children}</Context.Provider>;
}

export function useAuth() {
  const auth = useContext(Context);
  if (!auth) throw new Error('AuthProvider requerido.');
  return auth;
}
