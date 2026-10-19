import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from './useAuth';
import { consultarPerfil } from '../services/perfilService';
import { configureUnauthorizedHandler } from '../services/apiClient';
import { clearSession, readSession, saveSession } from '../services/sessionStorage';

export function AuthProvider({ children }) {
  // La restauración es síncrona: no se renderiza contenido protegido antes de leerla.
  const [session, setSession] = useState(readSession);
  const navigate = useNavigate();
  const currentSession = useRef(session);
  const logout = useCallback(() => {
    currentSession.current = {token:null,user:null};
    clearSession();
    setSession({ token: null, user: null });
  }, []);
  const login = useCallback((token, user) => {
    try { saveSession(token, user); }
    catch (error) {
      currentSession.current = {token:null,user:null};
      setSession({ token: null, user: null });
      throw error;
    }
    currentSession.current = {token,user};
    setSession({ token, user });
  }, []);

  // Una lectura antigua no puede restaurar una sesión cerrada o reemplazada.
  const refreshProfile = useCallback(async options => {
    const before = currentSession.current;
    if (!before.token) throw new Error('La sesión ya no está disponible.');
    const perfil = await consultarPerfil(options);
    if (options?.signal?.aborted || currentSession.current.token !== before.token || perfil.id !== before.user.id) throw new Error('La sesión cambió durante la consulta.');
    const updated = {token:before.token,user:{...currentSession.current.user,...perfil}};
    saveSession(updated.token,updated.user);
    currentSession.current=updated;
    setSession(updated);
    return perfil;
  }, []);

  useEffect(() => configureUnauthorizedHandler(() => {
    logout();
    navigate('/login', { replace: true });
  }), [logout, navigate]);

  const value = useMemo(() => ({
    ...session, isAuthenticated: Boolean(session.token && session.user),
    loading: false, login, logout, refreshProfile,
  }), [session, login, logout, refreshProfile]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
