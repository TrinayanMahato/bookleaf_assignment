import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { getMyTickets } from '../../api/author.api';
import useAuth from '../../hooks/useAuth';
import useAsync from '../../hooks/useAsync';
import useEventStream from '../../hooks/useEventStream';
import { EmptyState, ErrorBanner, LiveIndicator, Notice, Spinner, Toast } from '../../components/ui/Feedback';
import { StatusBadge } from '../../components/ui/Badge';
import Icon from '../../components/ui/Icon';
import MessageThread from '../../components/tickets/MessageThread';
import AttachmentList from '../../components/tickets/AttachmentList';
import { ACTIVE_STATUSES, STATUSES } from '../../utils/constants';
import { formatDate, formatDateTime } from '../../utils/format';

const FILTERS = ['All', ...STATUSES];
const STATUS_ICONS = { Open: 'clock', 'In Progress': 'hourglass', Resolved: 'checkCircle', Closed: 'lock' };

export default function MyTicketsPage() {
  const { user } = useAuth();
  const location = useLocation();
  const { data, error, loading, reload, setData } = useAsync(() => getMyTickets(user.authorId), [user.authorId]);
  const [filter, setFilter] = useState('All');
  const [toast, setToast] = useState(null);
  const [freshIds, setFreshIds] = useState(new Set()); // tickets updated live since the page opened

  // Live updates: an admin reply or status change replaces the ticket in place.
  const live = useEventStream(
    {
      'ticket:updated': (updated) => {
        setData((d) => {
          if (!d) return d;
          const others = d.tickets.filter((t) => t._id !== updated._id);
          return { ...d, tickets: [updated, ...others] };
        });
        setFreshIds((s) => new Set(s).add(updated._id));
        setToast(updated.subject);
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
  const counts = Object.fromEntries([['All', tickets.length], ...STATUSES.map((s) => [s, 0])]);
  tickets.forEach((t) => (counts[t.status] += 1));
  const shown = filter === 'All' ? tickets : tickets.filter((t) => t.status === filter);

  return (
    <>
      <div className="page-header">
        <div>
          <h1>My Tickets</h1>
          <p>Track your support queries. Replies and status changes from our team appear here instantly.</p>
        </div>
        <div className="page-actions">
          <Link to="/author/tickets/new" className="btn btn-primary"><Icon name="messagePlus" size={16} /> New query</Link>
        </div>
      </div>

      {location.state?.created && (
        <Notice tone="success">
          <strong>Query submitted.</strong> "{location.state.created}" is with our team. You'll see the reply here.
        </Notice>
      )}
      <ErrorBanner error={error} onRetry={reload} />
      {loading && !data && <Spinner label="Loading your tickets…" />}

      {data && tickets.length === 0 && (
        <EmptyState
          icon="message"
          title="No support queries yet"
          action={<Link to="/author/tickets/new" className="btn btn-primary"><Icon name="messagePlus" size={16} /> Raise a query</Link>}
        >
          Questions about royalties, ISBNs, printing or your book's status? We're here to help.
        </EmptyState>
      )}

      {tickets.length > 0 && (
        <div className="list-toolbar">
          <div className="tabs" role="tablist">
            {FILTERS.map((f) => (
              <button key={f} type="button" role="tab" aria-selected={filter === f} className={`tab ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
                {f} <span className="tab-count">{counts[f]}</span>
              </button>
            ))}
          </div>
          <LiveIndicator live={live} />
        </div>
      )}

      {tickets.length > 0 && shown.length === 0 && <EmptyState icon="inbox" title={`No ${filter.toLowerCase()} tickets`} />}

      <div className="ticket-list">
        {shown.map((t) => {
          const replies = t.messages.filter((m) => m.senderModel === 'Admin').length;
          const fresh = freshIds.has(t._id);
          const active = ACTIVE_STATUSES.includes(t.status);
          return (
            <details key={t._id} className={`card ticket-card ${fresh ? 'fresh' : ''}`} open={fresh || undefined}>
              <summary>
                <span className={`ticket-icon ${active ? 'pending' : 'answered'}`} aria-hidden="true">
                  <Icon name={STATUS_ICONS[t.status]} size={19} />
                </span>
                <div className="ticket-main">
                  <h3>
                    {fresh && <span className="unread-dot" aria-label="New update" />}
                    <span>{t.subject}</span>
                  </h3>
                  <div className="ticket-sub">
                    <span>{t.book ? t.book.title : 'General / Account Level'}</span>
                    <span className="sep">·</span>
                    <span>Opened {formatDate(t.createdAt)}</span>
                    <span className="sep">·</span>
                    <span>Updated {formatDateTime(t.updatedAt)}</span>
                  </div>
                </div>
                <div className="ticket-right">
                  <span className="reply-count" title={`${replies} repl${replies === 1 ? 'y' : 'ies'}`}><Icon name="message" size={14} />{replies}</span>
                  <StatusBadge status={t.status} />
                  <Icon name="chevronDown" size={18} className="chevron" />
                </div>
              </summary>
              <div className="ticket-body">
                <AttachmentList ticketId={t._id} attachments={t.attachments} />
                <MessageThread ticket={t} viewer="author" />
                {!replies && active && (
                  <div className="awaiting">
                    <Icon name="hourglass" size={16} />
                    Our team is looking into this. We usually reply within 48 hours, and you'll see it here as soon as we do.
                  </div>
                )}
              </div>
            </details>
          );
        })}
      </div>

      {toast && (
        <Toast title="Update from BookLeaf" onClose={() => setToast(null)}>
          {toast}
        </Toast>
      )}
    </>
  );
}
