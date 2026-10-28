import { Link } from 'react-router-dom';
import { getMyBooks } from '../../api/author.api';
import useAuth from '../../hooks/useAuth';
import useAsync from '../../hooks/useAsync';
import { EmptyState, ErrorBanner, Spinner } from '../../components/ui/Feedback';
import { Tag } from '../../components/ui/Badge';
import Icon from '../../components/ui/Icon';
import StatCard from '../../components/ui/StatCard';
import { PRODUCTION_STAGES } from '../../utils/constants';
import { formatDate, formatMoney } from '../../utils/format';

const PAYOUT_THRESHOLD = 1000;
const COVERS = [
  ['#16734a', '#0b3d27'],
  ['#1d4ed8', '#1e3a8a'],
  ['#9333ea', '#581c87'],
  ['#c2410c', '#7c2d12'],
  ['#0f766e', '#134e4a'],
  ['#be123c', '#881337'],
];

// A stable cover colour per book, so the same book always looks the same.
const coverStyle = (bookId) => {
  const hash = [...bookId].reduce((h, c) => h + c.charCodeAt(0), 0);
  const [from, to] = COVERS[hash % COVERS.length];
  return { background: `linear-gradient(150deg, ${from}, ${to})` };
};

const coverInitials = (title) =>
  title
    .split(' ')
    .filter((w) => /^[A-Za-z]/.test(w))
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');

function RoyaltyBox({ book }) {
  const total = book.totalRoyaltyEarned || 1;
  const pendingBelowThreshold = book.royaltyPending > 0 && book.royaltyPending < PAYOUT_THRESHOLD;
  return (
    <div className="royalty-box">
      <div className="royalty-head">
        <span>Royalty earned</span>
        <strong>{formatMoney(book.totalRoyaltyEarned)}</strong>
      </div>
      <div className="progress" aria-hidden="true">
        <div className="progress-paid" style={{ width: `${(book.royaltyPaid / total) * 100}%` }} />
        <div className="progress-pending" style={{ width: `${(book.royaltyPending / total) * 100}%` }} />
      </div>
      <div className="legend">
        <span><i className="legend-dot paid" />Paid {formatMoney(book.royaltyPaid)}</span>
        <span><i className="legend-dot pending" />Pending {formatMoney(book.royaltyPending)}</span>
      </div>
      <p className="royalty-note">
        {book.lastRoyaltyPayoutDate ? `Last payout ${formatDate(book.lastRoyaltyPayoutDate)}` : 'No payouts yet'}
        {pendingBelowThreshold && ' · below the ₹1,000 threshold, rolls over to next quarter'}
      </p>
    </div>
  );
}

function StageBox({ status }) {
  const stage = status.replace('In Production - ', '');
  const index = Math.max(0, PRODUCTION_STAGES.indexOf(stage));
  return (
    <div className="stage-box">
      <div className="royalty-head">
        <span>Production stage {index + 1} of {PRODUCTION_STAGES.length}</span>
        <strong>{stage}</strong>
      </div>
      <div className="progress" aria-hidden="true">
        <div className="progress-stage" style={{ width: `${((index + 1) / PRODUCTION_STAGES.length) * 100}%` }} />
      </div>
      <p>Sales and royalties will appear here once your book is published and live.</p>
    </div>
  );
}

function BookCard({ book }) {
  const live = book.status === 'Published & Live';
  return (
    <article className="card book-card">
      <div className="book-top">
        <div className="book-cover" style={coverStyle(book.bookId)} aria-hidden="true">{coverInitials(book.title)}</div>
        <div className="book-info">
          <h2>{book.title}</h2>
          <span className="muted">{book.genre} · {book.bookId}</span>
          {live ? <Tag tone="success" icon="checkCircle">Published &amp; live</Tag> : <Tag tone="blue" icon="clock">In production</Tag>}
        </div>
      </div>

      <dl className="book-meta">
        <div><dt>ISBN</dt><dd title={book.isbn ?? ''}>{book.isbn ?? 'Not assigned yet'}</dd></div>
        <div><dt>Published</dt><dd>{live ? formatDate(book.publicationDate) : '—'}</dd></div>
        <div><dt>MRP</dt><dd>{formatMoney(book.mrp)}</dd></div>
        <div><dt>Copies sold</dt><dd>{book.totalCopiesSold.toLocaleString('en-IN')}</dd></div>
      </dl>

      {live ? <RoyaltyBox book={book} /> : <StageBox status={book.status} />}

      <div className="book-foot">
        <div className="platforms">
          {live && book.availableOn.length > 0 ? book.availableOn.map((p) => <Tag key={p}>{p}</Tag>) : <span className="muted small">Not on sale yet</span>}
        </div>
        <Link to={`/author/tickets/new?book=${book.bookId}`} className="btn btn-ghost btn-small">
          <Icon name="message" size={14} /> Ask about this book
        </Link>
      </div>
    </article>
  );
}

export default function MyBooksPage() {
  const { user } = useAuth();
  const { data, error, loading, reload } = useAsync(() => getMyBooks(user.authorId), [user.authorId]);
  const books = data?.books ?? [];
  const totals = books.reduce(
    (t, b) => ({
      sold: t.sold + b.totalCopiesSold,
      earned: t.earned + b.totalRoyaltyEarned,
      pending: t.pending + b.royaltyPending,
      live: t.live + (b.status === 'Published & Live' ? 1 : 0),
    }),
    { sold: 0, earned: 0, pending: 0, live: 0 },
  );

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Welcome back, {user.name.split(' ')[0]}</h1>
          <p>Your books, sales and royalties at a glance.</p>
        </div>
        <div className="page-actions">
          <Link to="/author/tickets/new" className="btn btn-primary"><Icon name="messagePlus" size={16} /> Raise a query</Link>
        </div>
      </div>

      <ErrorBanner error={error} onRetry={reload} />
      {loading && !data && <Spinner label="Loading your books…" />}

      {data && books.length === 0 && <EmptyState icon="book" title="No books yet">Books you publish with BookLeaf will show up here.</EmptyState>}

      {books.length > 0 && (
        <>
          <div className="stats">
            <StatCard icon="book" tone="brand" label="Books" value={books.length} hint={`${totals.live} live · ${books.length - totals.live} in production`} />
            <StatCard icon="trending" tone="blue" label="Copies sold" value={totals.sold.toLocaleString('en-IN')} hint="Across all platforms" />
            <StatCard icon="wallet" tone="ai" label="Royalty earned" value={formatMoney(totals.earned)} hint="Lifetime" />
            <StatCard icon="hourglass" tone="warn" label="Royalty pending" value={formatMoney(totals.pending)} hint="Paid out quarterly" />
          </div>
          <div className="grid-books">
            {books.map((b) => (
              <BookCard key={b._id} book={b} />
            ))}
          </div>
        </>
      )}
    </>
  );
}
