import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import { homeFor } from '../../utils/roles';
import FieldError from '../../components/ui/FieldError';
import Logo from '../../components/ui/Logo';

// Seeded test accounts, shown so evaluators can get in without digging through the README.
const COPY = {
  author: {
    title: 'Author sign in',
    subtitle: 'Track your books, royalties and support tickets.',
    panelTitle: 'Your publishing, in one place',
    points: ['Live royalty earned, paid and pending', 'Raise a query about any book', 'See replies the moment they are sent'],
    demo: { email: 'sneha.kulkarni@email.com', password: 'author123' },
    switchTo: '/admin/login',
    switchLabel: 'BookLeaf team member? Sign in here',
  },
  admin: {
    title: 'Support team sign in',
    subtitle: 'Manage author queries from one prioritised queue.',
    panelTitle: 'Resolve author queries faster',
    points: ['AI classification and priority on every ticket', 'AI-drafted replies grounded in BookLeaf policy', 'Internal notes, assignment and live updates'],
    demo: { email: 'admin@bookleaf.com', password: 'admin123' },
    switchTo: '/login',
    switchLabel: 'Are you an author? Sign in here',
  },
};

export default function LoginPage({ role }) {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const copy = COPY[role];

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const signedIn = await login(role, form);
      navigate(location.state?.from ?? homeFor(signedIn.role), { replace: true });
    } catch (err) {
      setError(err);
      setSubmitting(false);
    }
  };

  const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  return (
    <div className={`auth-layout auth-${role}`}>
      <aside className="auth-panel">
        <Link to="/" className="auth-panel-logo"><Logo /></Link>
        <div>
          <h2>{copy.panelTitle}</h2>
          <ul>
            {copy.points.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </div>
        <p className="auth-panel-foot">BookLeaf Publishing · India &amp; US</p>
      </aside>

      <main className="auth-main">
        <div className="auth-form-wrap">
          <Link to="/" className="back-link">← Back to home</Link>
          <span className="role-pill">{role === 'admin' ? 'Support Desk' : 'Author Portal'}</span>
          <h1>{copy.title}</h1>
          <p className="muted">{copy.subtitle}</p>

          {user && user.role !== role && (
            <div className="banner banner-info">
              You're signed in as {user.name} ({user.role}). Signing in here switches this tab to the {role} account.
            </div>
          )}
          {error && !error.details && <div className="banner banner-error">{error.message}</div>}

          <form className="form" onSubmit={submit} noValidate>
            <div className="field">
              <label htmlFor="email">Email address</label>
              <input id="email" type="email" autoComplete="username" placeholder="you@example.com" value={form.email} onChange={update('email')} required />
              <FieldError details={error?.details} name="email" />
            </div>
            <div className="field">
              <label htmlFor="password">Password</label>
              <input id="password" type="password" autoComplete="current-password" placeholder="••••••••" value={form.password} onChange={update('password')} required />
              <FieldError details={error?.details} name="password" />
            </div>
            <button type="submit" className="btn btn-primary btn-block btn-large" disabled={submitting}>
              {submitting ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <div className="demo-box">
            <div>
              <strong>Demo account</strong>
              <span>{copy.demo.email} · {copy.demo.password}</span>
            </div>
            <button type="button" className="btn btn-small" onClick={() => setForm(copy.demo)}>Use demo account</button>
          </div>

          <p className="auth-switch">
            <Link to={copy.switchTo}>{copy.switchLabel}</Link>
          </p>
        </div>
      </main>
    </div>
  );
}
