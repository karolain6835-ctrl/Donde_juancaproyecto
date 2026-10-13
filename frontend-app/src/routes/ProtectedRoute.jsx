import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';

export default function ProtectedRoute({ children }) {
  const { loading, isAuthenticated } = useAuth();
  if (loading) return <p role="status">Restaurando sesión...</p>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
}
