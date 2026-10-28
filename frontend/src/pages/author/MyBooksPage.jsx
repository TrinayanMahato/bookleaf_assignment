import { Link } from 'react-router-dom';
import { getMyBooks } from '../../api/author.api';
import useAuth from '../../hooks/useAuth';
import useAsync from '../../hooks/useAsync';
import { EmptyState, ErrorBanner, Spinner } from '../../components/ui/Feedback';
import { Tag } from '../../components/ui/Badge';
import { formatDate, formatMoney } from '../../utils/format';

const PAYOUT_THRESHOLD = 1000;

function BookCard({ book }) {
  const live = book.status === 'Published & Live';
  return (
    <article className="card book-card">
      <div className="book-head">
        <div>
          <h2>{book.title}</h2>
          <p className="muted small">{book.genre}</p>
        </div>
        <Tag tone={live ? 'success' : 'neutral'}>{live ? 'Live' : book.status.replace('In Production - ', 'In production · ')}</Tag>
      </div>

      <dl className="book-meta">
        <dt>ISBN</dt>
        <dd>{book.isbn ?? 'Not assigned yet'}</dd>
        <dt>Published</dt>
        <dd>{live ? formatDate(book.publicationDate) : 'Not yet published'}</dd>
        <dt>MRP</dt>
        <dd>{formatMoney(book.mrp)}</dd>
        <dt>Copies sold</dt>
        <dd>{book.totalCopiesSold.toLocaleString('en-IN')}</dd>
      </dl>

      {live ? (
        <>
          <div className="royalty">
            <div>
              <span>Earned</span>
              <strong>{formatMoney(book.totalRoyaltyEarned)}</strong>
            </div>
            <div>
              <span>Paid</span>
              <strong>{formatMoney(book.royaltyPaid)}</strong>
            </div>
            <div className={book.royaltyPending > 0 ? 'pending' : ''}>
              <span>Pending</span>
              <strong>{formatMoney(book.royaltyPending)}</strong>
            </div>
          </div>
          <p className="muted small" style={{ marginTop: '0.5rem' }}>
            {book.lastRoyaltyPayoutDate ? `Last payout ${formatDate(book.lastRoyaltyPayoutDate)}` : 'No payouts yet'}
            {book.royaltyPending > 0 && book.royaltyPending < PAYOUT_THRESHOLD && ' · below the ₹1,000 payout threshold, rolls over to next quarter'}
          </p>
          <div className="platforms">
            {book.availableOn.map((p) => (
              <Tag key={p}>{p}</Tag>
            ))}
          </div>
        </>
      ) : (
        <p className="production-note">Your book is in production. Royalties and sales will appear here once it is published and live.</p>
      )}
    </article>
  );
}

export default function MyBooksPage() {
  const { user } = useAuth();
  const { data, error, loading, reload } = useAsync(() => getMyBooks(user.authorId), [user.authorId]);
  const books = data?.books ?? [];
  const totals = books.reduce(
    (t, b) => ({ sold: t.sold + b.totalCopiesSold, earned: t.earned + b.totalRoyaltyEarned, pending: t.pending + b.royaltyPending }),
    { sold: 0, earned: 0, pending: 0 },
  );

  return (
    <>
      <div className="page-header">
        <div>
          <h1>My Books</h1>
          <p>Welcome back, {user.name.split(' ')[0]}.</p>
        </div>
        <Link to="/author/tickets/new" className="btn btn-primary">Raise a support query</Link>
      </div>

      <ErrorBanner error={error} onRetry={reload} />
      {loading && !data && <Spinner label="Loading your books…" />}

      {data && books.length === 0 && <EmptyState title="No books yet">Books you publish with BookLeaf will show up here.</EmptyState>}

      {books.length > 0 && (
        <>
          <div className="stats">
            <div className="stat"><div className="stat-label">Books</div><div className="stat-value">{books.length}</div></div>
            <div className="stat"><div className="stat-label">Copies sold</div><div className="stat-value">{totals.sold.toLocaleString('en-IN')}</div></div>
            <div className="stat"><div className="stat-label">Royalty earned</div><div className="stat-value">{formatMoney(totals.earned)}</div></div>
            <div className="stat stat-warn"><div className="stat-label">Royalty pending</div><div className="stat-value">{formatMoney(totals.pending)}</div></div>
          </div>
          <div className="grid grid-books">
            {books.map((b) => (
              <BookCard key={b._id} book={b} />
            ))}
          </div>
        </>
      )}
    </>
  );
}
