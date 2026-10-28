import { Navigate, Outlet } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import { homeFor } from '../utils/roles';

// Skips a login page only when the user is already signed in with that page's role.
// An author can still open /admin/login (and vice versa) to switch accounts.
export default function RedirectIfAuthenticated({ role }) {
  const { user } = useAuth();
  return user?.role === role ? <Navigate to={homeFor(role)} replace /> : <Outlet />;
}
