import { Link } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import Logo from '../components/ui/Logo';
import { homeFor } from '../utils/roles';

const FEATURES = [
  { icon: '📚', title: 'Your books at a glance', text: 'Status, ISBN, copies sold and a clear split of royalty earned, paid and pending for every title.' },
  { icon: '✨', title: 'AI-assisted triage', text: 'Every query is classified and prioritised automatically, so urgent issues like missing royalties reach the team first.' },
  { icon: '⚡', title: 'Replies in real time', text: 'Responses from the BookLeaf team appear on your ticket the moment they are sent. No refreshing.' },
  { icon: '🛡️', title: 'Private by design', text: 'Authors only ever see their own books and tickets. Internal team notes stay internal.' },
];

const YEAR = new Date().getFullYear();

const STEPS = [
  { n: '1', title: 'Raise a query', text: 'Pick the book, describe the issue, attach photos if it helps.' },
  { n: '2', title: 'We triage it', text: 'AI sorts it into the right category and priority for the support team.' },
  { n: '3', title: 'Get a clear answer', text: 'A real team member replies with specifics, timelines and next steps.' },
];

export default function LandingPage() {
  const { user } = useAuth();

  return (
    <div className="landing">
      <header className="landing-nav">
        <Logo />
        <nav className="landing-nav-actions">
          {user ? (
            <Link to={homeFor(user.role)} className="btn btn-primary btn-small">Go to dashboard</Link>
          ) : (
            <>
              <Link to="/admin/login" className="btn btn-ghost btn-small">Admin login</Link>
              <Link to="/login" className="btn btn-primary btn-small">Author login</Link>
            </>
          )}
        </nav>
      </header>

      <section className="hero">
        <span className="eyebrow">Author Support &amp; Communication Portal</span>
        <h1>Answers about your book, <span className="accent">without the wait.</span></h1>
        <p className="hero-lead">
          BookLeaf publishes 1,200+ books every month for authors across India and the US. This portal lets authors track their
          books and royalties and get fast, consistent help on royalties, ISBNs, printing, distribution and production, while
          our support team works from one AI-assisted queue.
        </p>
        <div className="hero-actions">
          <Link to="/login" className="role-card role-author">
            <span className="role-icon" aria-hidden="true">✍️</span>
            <span>
              <strong>I'm an author</strong>
              <span>Track books, royalties and support tickets</span>
            </span>
            <span className="role-arrow" aria-hidden="true">→</span>
          </Link>
          <Link to="/admin/login" className="role-card role-admin">
            <span className="role-icon" aria-hidden="true">🎧</span>
            <span>
              <strong>I'm on the BookLeaf team</strong>
              <span>Manage the support queue with AI drafts</span>
            </span>
            <span className="role-arrow" aria-hidden="true">→</span>
          </Link>
        </div>
        <div className="hero-stats">
          <div><strong>22,000+</strong><span>titles in catalogue</span></div>
          <div><strong>1,200+</strong><span>books published monthly</span></div>
          <div><strong>80%</strong><span>of net profit to authors</span></div>
        </div>
      </section>

      <section className="landing-section">
        <h2>Built for authors and the team that supports them</h2>
        <div className="feature-grid">
          {FEATURES.map((f) => (
            <div key={f.title} className="feature">
              <span className="feature-icon" aria-hidden="true">{f.icon}</span>
              <h3>{f.title}</h3>
              <p>{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="landing-section">
        <h2>How support works</h2>
        <ol className="steps">
          {STEPS.map((s) => (
            <li key={s.n}>
              <span className="step-n">{s.n}</span>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <footer className="landing-footer">
        <Logo />
        <span>© {YEAR} BookLeaf Publishing · Delhi, India</span>
      </footer>
    </div>
  );
}
