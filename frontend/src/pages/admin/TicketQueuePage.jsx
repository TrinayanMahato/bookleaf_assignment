import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listTickets } from '../../api/admin.api';
import useAsync from '../../hooks/useAsync';
import useEventStream from '../../hooks/useEventStream';
import { EmptyState, ErrorBanner, Spinner } from '../../components/ui/Feedback';
import { PriorityBadge, StatusBadge, Tag } from '../../components/ui/Badge';
import { CATEGORIES, PRIORITIES, STATUSES } from '../../utils/constants';
import { formatAge, formatDate, isOverdue } from '../../utils/format';

const DEFAULT_FILTERS = { status: 'Pending', category: '', priority: '', assigned: '', from: '', to: '' };

const toApiFilters = (f, page) => ({
  status: f.status === 'all' ? [] : [f.status],
  category: f.category,
  priority: f.priority,
  assigned: f.assigned,
  from: f.from,
  to: f.to,
  page,
});

export default function TicketQueuePage() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [page, setPage] = useState(1);
  const { data, error, loading, reload } = useAsync(() => listTickets(toApiFilters(filters, page)), [filters, page]);

  // New tickets, replies and status changes re-sort the queue live.
  useEventStream({
    'ticket:created': () => reload({ silent: true }),
    'ticket:changed': () => reload({ silent: true }),
  }, () => reload({ silent: true }));

  const setFilter = (field) => (e) => {
    setFilters((f) => ({ ...f, [field]: e.target.value }));
    setPage(1);
  };
  const counts = data?.counts;
  const overdue = data?.tickets.filter(isOverdue).length ?? 0;

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Ticket queue</h1>
          <p>Most urgent first, then oldest first. Tickets move to Answered automatically when you reply.</p>
        </div>
      </div>

      {counts && (
        <div className="stats">
          <div className="stat stat-critical"><div className="stat-label">Critical pending</div><div className="stat-value">{counts.Critical}</div></div>
          <div className="stat stat-warn"><div className="stat-label">High pending</div><div className="stat-value">{counts.High}</div></div>
          <div className="stat"><div className="stat-label">Medium pending</div><div className="stat-value">{counts.Medium}</div></div>
          <div className="stat"><div className="stat-label">Low pending</div><div className="stat-value">{counts.Low}</div></div>
          <div className="stat"><div className="stat-label">Pending unassigned</div><div className="stat-value">{counts.unassigned}</div></div>
          <div className="stat stat-critical"><div className="stat-label">Overdue (this page)</div><div className="stat-value">{overdue}</div></div>
        </div>
      )}

      <div className="card filters">
        <div className="field">
          <label htmlFor="f-status">Status</label>
          <select id="f-status" value={filters.status} onChange={setFilter('status')}>
            {STATUSES.map((s) => <option key={s} value={s}>{s === 'Pending' ? 'Pending (needs a reply)' : s}</option>)}
            <option value="all">All statuses</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="f-category">Category</label>
          <select id="f-category" value={filters.category} onChange={setFilter('category')}>
            <option value="">All categories</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="f-priority">Priority</label>
          <select id="f-priority" value={filters.priority} onChange={setFilter('priority')}>
            <option value="">All priorities</option>
            {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="f-assigned">Assigned</label>
          <select id="f-assigned" value={filters.assigned} onChange={setFilter('assigned')}>
            <option value="">Anyone</option>
            <option value="me">Assigned to me</option>
            <option value="unassigned">Unassigned</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="f-from">From</label>
          <input id="f-from" type="date" value={filters.from} onChange={setFilter('from')} />
        </div>
        <div className="field">
          <label htmlFor="f-to">To</label>
          <input id="f-to" type="date" value={filters.to} onChange={setFilter('to')} />
        </div>
        <button type="button" className="btn" onClick={() => { setFilters(DEFAULT_FILTERS); setPage(1); }}>Reset</button>
      </div>

      <ErrorBanner error={error} onRetry={reload} />
      {loading && !data && <Spinner label="Loading tickets…" />}
      {data && data.tickets.length === 0 && <EmptyState title="No tickets match these filters">Nothing waiting. 🎉</EmptyState>}

      {data?.tickets.length > 0 && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Priority</th>
                <th>Ticket</th>
                <th>Category</th>
                <th>Author / Book</th>
                <th>Status</th>
                <th>Age</th>
                <th>Assigned</th>
              </tr>
            </thead>
            <tbody>
              {data.tickets.map((t) => (
                <tr key={t._id} className={t.priority === 'Critical' ? 'row-critical' : ''} onClick={() => navigate(`/admin/tickets/${t._id}`)}>
                  <td><PriorityBadge priority={t.priority} /></td>
                  <td>
                    <strong>{t.subject}</strong>
                    <div className="muted small">Opened {formatDate(t.createdAt)}</div>
                  </td>
                  <td>
                    {t.category}
                    <div>{t.classificationSource === 'ai' ? <Tag tone="ai">AI</Tag> : t.classificationSource === 'admin' ? <Tag>Manual</Tag> : <Tag>Rules</Tag>}</div>
                  </td>
                  <td>
                    {t.author?.name}
                    <div className="muted small">{t.book?.title ?? 'General / Account'}</div>
                  </td>
                  <td><StatusBadge status={t.status} /></td>
                  <td className={isOverdue(t) ? 'age-overdue' : ''} title={isOverdue(t) ? 'Overdue for its priority' : ''}>{formatAge(t.createdAt)}</td>
                  <td>{t.assignedTo?.name ?? <Tag tone="danger">Unassigned</Tag>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data && data.pages > 1 && (
        <div className="pagination">
          <button type="button" className="btn btn-small" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>← Previous</button>
          <span className="muted small">Page {data.page} of {data.pages} · {data.total} tickets</span>
          <button type="button" className="btn btn-small" disabled={page >= data.pages} onClick={() => setPage((p) => p + 1)}>Next →</button>
        </div>
      )}
    </>
  );
}
