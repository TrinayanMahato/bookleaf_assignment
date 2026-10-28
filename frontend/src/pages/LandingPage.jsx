import { Link } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import Logo from '../components/ui/Logo';
import Icon from '../components/ui/Icon';
import { homeFor } from '../utils/roles';

const FEATURES = [
  { icon: 'book', title: 'Your books at a glance', text: 'Status, ISBN, copies sold and a clear split of royalty earned, paid and pending for every title.' },
  { icon: 'sparkles', ai: true, title: 'AI-assisted triage', text: 'Every query is classified and prioritised automatically, so urgent issues like missing royalties reach the team first.' },
  { icon: 'zap', title: 'Replies in real time', text: 'Responses from the BookLeaf team appear on your ticket the moment they are sent. No refreshing.' },
  { icon: 'shield', title: 'Private by design', text: 'Authors only ever see their own books and tickets. Internal team notes stay internal.' },
];

const STEPS = [
  { title: 'Raise a query', text: 'Pick the book, describe the issue and attach photos if it helps.' },
  { title: 'We triage it', text: 'AI sorts it into the right category and priority for the support team.' },
  { title: 'Get a clear answer', text: 'A real team member replies with specifics, timelines and next steps.' },
];

const YEAR = new Date().getFullYear();

// A static preview of the admin ticket view for the hero.
function Mockup() {
  return (
    <div className="mockup" aria-hidden="true">
      <div className="mock-window">
        <div className="mock-bar"><i /><i /><i /><span>Support Desk · Ticket</span></div>
        <div className="mock-body">
          <div className="mock-ticket">
            <div>
              <h4>Royalty not received for Q3</h4>
              <p>Sneha Kulkarni · The Silent River</p>
            </div>
            <div className="mock-tags">
              <span className="badge priority-high">High</span>
              <span className="tag tag-ai"><Icon name="sparkles" size={12} />Royalty</span>
            </div>
          </div>
          <div className="mock-msg">
            <span className="avatar avatar-sm">SK</span>
            <p className="msg-bubble">My Q3 royalty statement shows ₹4,200 pending but nothing has reached my account yet…</p>
          </div>
          <div className="mock-draft">
            <div className="mock-draft-head"><span><Icon name="sparkles" size={14} />AI draft</span><span>Knowledge base</span></div>
            <p>Hi Sneha, thanks for reaching out. Your Q3 royalty of ₹4,200 is scheduled for the payout run on the 15th…</p>
            <div className="mock-actions">
              <span className="btn btn-small">Edit</span>
              <span className="btn btn-primary btn-small">Send reply</span>
            </div>
          </div>
        </div>
      </div>
      <div className="mock-float float-live">
        <span className="mock-float-icon"><Icon name="zap" size={15} /></span>
        <div><strong>Reply delivered</strong><span>Author notified instantly</span></div>
      </div>
      <div className="mock-float float-ai">
        <span className="mock-float-icon"><Icon name="sparkles" size={15} /></span>
        <div><strong>Auto-classified</strong><span>Priority set to High</span></div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const { user } = useAuth();

  return (
    <div className="landing">
      <div className="landing-nav-wrap">
        <header className="landing-nav">
          <Logo />
          <nav className="landing-links" aria-label="Sections">
            <a href="#features">Features</a>
            <a href="#portals">Portals</a>
            <a href="#how">How it works</a>
          </nav>
          <div className="landing-nav-actions">
            {user ? (
              <Link to={homeFor(user.role)} className="btn btn-primary btn-small">Go to dashboard <Icon name="arrowRight" size={14} /></Link>
            ) : (
              <>
                <Link to="/admin/login" className="btn btn-ghost btn-small">Team login</Link>
                <Link to="/login" className="btn btn-primary btn-small">Author login</Link>
              </>
            )}
          </div>
        </header>
      </div>

      <section className="hero">
        <div className="hero-inner">
          <div>
            <span className="eyebrow"><span className="eyebrow-chip">New</span>Author Support &amp; Communication Portal</span>
            <h1>Answers about your book, <span className="accent">without the wait.</span></h1>
            <p className="hero-lead">
              Track your books and royalties, and get fast, consistent help on royalties, ISBNs, printing, distribution and
              production, while our support team works from one AI-assisted queue.
            </p>
            <div className="portal-choices">
              <Link to="/login" className="role-card">
                <span className="role-icon"><Icon name="pen" size={20} /></span>
                <span className="role-text">
                  <strong>I'm an author</strong>
                  <span>Books, royalties and support tickets</span>
                </span>
                <Icon name="arrowRight" size={18} className="role-arrow" />
              </Link>
              <Link to="/admin/login" className="role-card role-admin">
                <span className="role-icon"><Icon name="headset" size={20} /></span>
                <span className="role-text">
                  <strong>I'm on the BookLeaf team</strong>
                  <span>Prioritised queue with AI drafts</span>
                </span>
                <Icon name="arrowRight" size={18} className="role-arrow" />
              </Link>
            </div>
            <p className="hero-note"><Icon name="lock" size={14} /> Demo accounts are shown on each sign-in page.</p>
          </div>
          <Mockup />
        </div>
      </section>

      <div className="stat-band">
        <div><strong>22,000+</strong><span>titles in catalogue</span></div>
        <div><strong>1,200+</strong><span>books published monthly</span></div>
        <div><strong>80%</strong><span>of net profit to authors</span></div>
        <div><strong>48h</strong><span>typical reply time</span></div>
      </div>

      <section className="section" id="features">
        <div className="section-head">
          <span className="kicker">Features</span>
          <h2>Built for authors and the team that supports them</h2>
          <p>Everything an author needs to know about their book, and everything the team needs to answer quickly.</p>
        </div>
        <div className="feature-grid">
          {FEATURES.map((f) => (
            <div key={f.title} className="feature">
              <span className={`feature-icon ${f.ai ? 'ai' : ''}`}><Icon name={f.icon} size={20} /></span>
              <h3>{f.title}</h3>
              <p>{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="band" id="portals">
        <div className="section">
          <div className="section-head">
            <span className="kicker">Two portals</span>
            <h2>One place for every conversation</h2>
          </div>
          <div className="portal-split">
            <div className="portal-panel">
              <span className="portal-tag"><Icon name="pen" size={13} /> Author Portal</span>
              <h3>Know where your book stands</h3>
              <p>See every title, its production stage and royalties, and raise a query in seconds.</p>
              <ul className="check-list">
                <li><Icon name="check" size={16} />Royalty earned, paid and pending per book</li>
                <li><Icon name="check" size={16} />Queries with photo or PDF attachments</li>
                <li><Icon name="check" size={16} />Live replies without refreshing</li>
              </ul>
              <Link to="/login" className="btn btn-primary">Author sign in <Icon name="arrowRight" size={15} /></Link>
            </div>
            <div className="portal-panel portal-panel-dark">
              <span className="portal-tag"><Icon name="headset" size={13} /> Support Desk</span>
              <h3>Answer the right ticket first</h3>
              <p>A single queue sorted by urgency, with the author's book data beside every ticket.</p>
              <ul className="check-list">
                <li><Icon name="check" size={16} />AI category and priority, with override</li>
                <li><Icon name="check" size={16} />AI-drafted replies grounded in BookLeaf policy</li>
                <li><Icon name="check" size={16} />Internal notes and assignment</li>
              </ul>
              <Link to="/admin/login" className="btn btn-light">Team sign in <Icon name="arrowRight" size={15} /></Link>
            </div>
          </div>
        </div>
      </section>

      <section className="section" id="how">
        <div className="section-head">
          <span className="kicker">How it works</span>
          <h2>From question to answer in three steps</h2>
        </div>
        <ol className="steps">
          {STEPS.map((s, i) => (
            <li key={s.title}>
              <span className="step-n">{i + 1}</span>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="cta">
        <div className="cta-inner">
          <h2>Have a question about your book?</h2>
          <p>Sign in to see your royalties and talk to the BookLeaf team.</p>
          <div className="cta-actions">
            <Link to="/login" className="btn btn-primary btn-large">Author sign in</Link>
            <Link to="/admin/login" className="btn btn-outline-light btn-large">Team sign in</Link>
          </div>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <Logo />
          <span>© {YEAR} BookLeaf Publishing · Delhi, India</span>
        </div>
      </footer>
    </div>
  );
}
