import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { getMyTickets } from '../../api/author.api';
import useAuth from '../../hooks/useAuth';
import useAsync from '../../hooks/useAsync';
import useEventStream from '../../hooks/useEventStream';
import { EmptyState, ErrorBanner, Notice, Spinner } from '../../components/ui/Feedback';
import { StatusBadge } from '../../components/ui/Badge';
import MessageThread from '../../components/tickets/MessageThread';
import AttachmentList from '../../components/tickets/AttachmentList';
import { formatDate, formatDateTime } from '../../utils/format';

export default function MyTicketsPage() {
  const { user } = useAuth();
  const location = useLocation();
  const { data, error, loading, reload, setData } = useAsync(() => getMyTickets(user.authorId), [user.authorId]);
  const [toast, setToast] = useState(null);
  const [freshIds, setFreshIds] = useState(new Set()); // tickets updated live since the page opened

  // Live updates: an admin reply (which also flips the status to Answered) replaces the ticket in place.
  useEventStream(
    {
      'ticket:updated': (updated) => {
        setData((d) => {
          if (!d) return d;
          const others = d.tickets.filter((t) => t._id !== updated._id);
          return { ...d, tickets: [updated, ...others] };
        });
        setFreshIds((s) => new Set(s).add(updated._id));
        setToast(`Update on "${updated.subject}"`);
      },
    },
    () => reload({ silent: true }), // after a reconnect, catch up on anything missed
  );

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  const tickets = data?.tickets ?? [];

  return (
    <>
      <div className="page-header">
        <div>
          <h1>My Tickets</h1>
          <p>Replies from our team appear here instantly.</p>
        </div>
        <Link to="/author/tickets/new" className="btn btn-primary">New query</Link>
      </div>

      {location.state?.created && <Notice tone="success">Your query "{location.state.created}" was submitted. We'll be in touch soon.</Notice>}
      <ErrorBanner error={error} onRetry={reload} />
      {loading && !data && <Spinner label="Loading your tickets…" />}

      {data && tickets.length === 0 && (
        <EmptyState title="No support queries yet" action={<Link to="/author/tickets/new" className="btn btn-primary">Raise a query</Link>}>
          Questions about royalties, ISBNs, printing or your book's status? We're here to help.
        </EmptyState>
      )}

      <div className="ticket-list">
        {tickets.map((t) => {
          const replies = t.messages.filter((m) => m.senderModel === 'Admin').length;
          return (
            <details key={t._id} className="card ticket-card" open={freshIds.has(t._id) || undefined}>
              <summary>
                <div className="ticket-summary">
                  <div>
                    <h3>
                      {freshIds.has(t._id) && <span className="unread-dot" aria-label="New update" />} {t.subject}
                    </h3>
                    <div className="ticket-sub">
                      {t.book ? t.book.title : 'General / Account Level'} · opened {formatDate(t.createdAt)} · last update {formatDateTime(t.updatedAt)}
                    </div>
                  </div>
                  <div className="ticket-badges">
                    <span className="muted small">{replies ? `${replies} repl${replies > 1 ? 'ies' : 'y'}` : 'Awaiting reply'}</span>
                    <StatusBadge status={t.status} />
                  </div>
                </div>
              </summary>
              <AttachmentList ticketId={t._id} attachments={t.attachments} />
              <MessageThread ticket={t} viewer="author" />
            </details>
          );
        })}
      </div>

      {toast && <div className="toast" role="status">🔔 {toast}</div>}
    </>
  );
}
