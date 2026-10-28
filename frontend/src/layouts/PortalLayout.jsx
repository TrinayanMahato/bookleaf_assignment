import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import Logo from '../components/ui/Logo';
import Icon from '../components/ui/Icon';
import { initials } from '../utils/format';

const WORKSPACE = {
  author: { icon: 'pen', title: 'Author Portal', sub: 'BookLeaf Publishing' },
  admin: { icon: 'headset', title: 'Support Desk', sub: 'BookLeaf team' },
};

// Shared shell for both portals: dark sidebar on desktop, top bar on mobile.
export default function PortalLayout({ role, links }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const workspace = WORKSPACE[role];

  // Navigate first so RequireRole doesn't bounce to the login page once the user is cleared.
  const signOut = () => {
    navigate('/', { replace: true });
    logout();
  };

  return (
    <div className="app">
      <aside className="sidebar">
        <Link to="/" className="brand-link sidebar-brand"><Logo /></Link>

        <div className="workspace">
          <span className="workspace-icon"><Icon name={workspace.icon} size={16} /></span>
          <div>
            <strong>{workspace.title}</strong>
            <span>{workspace.sub}</span>
          </div>
        </div>

        <nav className="side-nav" aria-label="Main">
          <span className="side-label">Menu</span>
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} className={({ isActive }) => `side-link ${isActive ? 'active' : ''}`}>
              <Icon name={l.icon} size={18} />
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-help">
          <strong><Icon name={role === 'admin' ? 'zap' : 'help'} size={14} />{role === 'admin' ? 'Live queue' : 'Need help?'}</strong>
          {role === 'admin'
            ? 'New tickets and replies appear without refreshing.'
            : 'Raise a query and our team replies here, usually within 48 hours.'}
        </div>

        <div className="sidebar-foot">
          <span className="avatar" aria-hidden="true">{initials(user.name)}</span>
          <span className="user-meta">
            <span className="user-name">{user.name}</span>
            <span className="user-role">{role === 'admin' ? user.email : `Author · ${user.authorId}`}</span>
          </span>
          <button type="button" className="signout" onClick={signOut} title="Sign out" aria-label="Sign out">
            <Icon name="logOut" size={17} />
          </button>
        </div>
      </aside>

      <main className="main">
        <div className="page">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
