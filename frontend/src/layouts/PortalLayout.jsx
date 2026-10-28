import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import Logo from '../components/ui/Logo';

const initials = (name) =>
  name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

// Shared shell for both portals; each passes its own nav links.
export default function PortalLayout({ title, role, links }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const signOut = () => {
    logout();
    navigate('/', { replace: true });
  };

  return (
    <div className={`app-shell shell-${role}`}>
      <header className="topbar">
        <div className="topbar-inner">
          <Link to="/" className="brand-link"><Logo subtitle={title} /></Link>
          <nav className="nav" aria-label="Main">
            {links.map((l) => (
              <NavLink key={l.to} to={l.to} end={l.end} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                {l.label}
              </NavLink>
            ))}
          </nav>
          <div className="user-box">
            <span className="avatar" aria-hidden="true">{initials(user.name)}</span>
            <span className="user-meta">
              <span className="user-name">{user.name}</span>
              <span className="user-role">{role === 'admin' ? 'Support team' : user.authorId}</span>
            </span>
            <button type="button" className="btn btn-ghost btn-small" onClick={signOut}>Sign out</button>
          </div>
        </div>
      </header>
      <main className="page">
        <Outlet />
      </main>
    </div>
  );
}
