import { Navigate, Outlet, useLocation } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import { homeFor, loginFor } from '../utils/roles';

// Guards a group of routes: logged-out users go to that portal's login,
// users with the other role are sent back to their own portal.
export default function RequireRole({ role }) {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) return <Navigate to={loginFor(role)} replace state={{ from: location.pathname }} />;
  if (user.role !== role) return <Navigate to={homeFor(user.role)} replace />;
  return <Outlet />;
}
