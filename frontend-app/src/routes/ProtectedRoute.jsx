import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { can } from '../utils/permissions';
import AccessDenied from '../components/AccessDenied';

export default function ProtectedRoute({ children, permission }) {
  const { loading, isAuthenticated, user } = useAuth();
  if (loading) return <p role="status">Restaurando sesión...</p>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (permission && !can(user, permission)) return <AccessDenied />;
  return children;
}
