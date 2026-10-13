import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from './useAuth';
import { configureUnauthorizedHandler } from '../services/apiClient';
import { clearSession, readSession, saveSession } from '../services/sessionStorage';

export function AuthProvider({ children }) {
  // La restauración es síncrona: no se renderiza contenido protegido antes de leerla.
  const [session, setSession] = useState(readSession);
  const navigate = useNavigate();
  const logout = useCallback(() => {
    clearSession();
    setSession({ token: null, user: null });
  }, []);
  const login = useCallback((token, user) => {
    try { saveSession(token, user); }
    catch (error) {
      setSession({ token: null, user: null });
      throw error;
    }
    setSession({ token, user });
  }, []);

  useEffect(() => configureUnauthorizedHandler(() => {
    logout();
    navigate('/login', { replace: true });
  }), [logout, navigate]);

  const value = useMemo(() => ({
    ...session, isAuthenticated: Boolean(session.token && session.user),
    loading: false, login, logout,
  }), [session, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
