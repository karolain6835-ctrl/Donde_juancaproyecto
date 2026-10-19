import { useAuth } from '../context/useAuth';
import { can } from '../utils/permissions';

export default function Can({ permission, children }) {
  const { user } = useAuth();
  return can(user, permission) ? children : null;
}
