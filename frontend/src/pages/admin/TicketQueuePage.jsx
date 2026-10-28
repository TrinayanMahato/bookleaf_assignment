import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listTickets } from '../../api/admin.api';
import useAsync from '../../hooks/useAsync';
import useEventStream from '../../hooks/useEventStream';
import { EmptyState, ErrorBanner, LiveIndicator, Spinner } from '../../components/ui/Feedback';
import { PriorityBadge, SourceTag, StatusBadge } from '../../components/ui/Badge';
import Icon from '../../components/ui/Icon';
import StatCard from '../../components/ui/StatCard';
import CategoryLabel from '../../components/tickets/CategoryLabel';
import { CATEGORIES, PRIORITIES } from '../../utils/constants';
import { formatAge, formatDate, initials, isOverdue } from '../../utils/format';

const DEFAULT_FILTERS = { status: 'Pending', category: '', priority: '', assigned: '', from: '', to: '' };
const STATUS_TABS = [
  ['Pending', 'Needs reply'],
  ['Answered', 'Answered'],
  ['all', 'All tickets'],
];

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
  const live = useEventStream({
    'ticket:created': () => reload({ silent: true }),
    'ticket:changed': () => reload({ silent: true }),
  }, () => reload({ silent: true }));

  const setFilter = (field, value) => {
    setFilters((f) => ({ ...f, [field]: value }));
    setPage(1);
  };
  const onFilter = (field) => (e) => setFilter(field, e.target.value);
  const filtered = Object.keys(DEFAULT_FILTERS).some((k) => k !== 'status' && filters[k] !== DEFAULT_FILTERS[k]);
  const counts = data?.counts;
  const overdue = data?.tickets.filter(isOverdue).length ?? 0;

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Ticket queue</h1>
          <p>Most urgent first, then oldest. Tickets move to Answered automatically when you reply.</p>
        </div>
        <div className="page-actions">
          <LiveIndicator live={live} />
        </div>
      </div>

      {counts && (
        <div className="stats stats-6">
          <StatCard icon="alert" tone="danger" label="Critical" value={counts.Critical} hint="Pending" alert={counts.Critical > 0} />
          <StatCard icon="zap" tone="orange" label="High" value={counts.High} hint="Pending" />
          <StatCard icon="layers" tone="warn" label="Medium" value={counts.Medium} hint="Pending" />
          <StatCard icon="inbox" tone="blue" label="Low" value={counts.Low} hint="Pending" />
          <StatCard icon="user" tone="ai" label="Unassigned" value={counts.unassigned} hint="Pending" />
          <StatCard icon="clock" tone="danger" label="Overdue" value={overdue} hint="On this page" />
        </div>
      )}

      <div className="card card-flush">
        <div className="card-header">
          <div className="tabs" role="tablist">
            {STATUS_TABS.map(([value, label]) => (
              <button key={value} type="button" role="tab" aria-selected={filters.status === value} className={`tab ${filters.status === value ? 'active' : ''}`} onClick={() => setFilter('status', value)}>
                {label}
                {filters.status === value && data && <span className="tab-count">{data.total}</span>}
              </button>
            ))}
          </div>
        </div>

        <div className="toolbar">
          <select aria-label="Category" value={filters.category} onChange={onFilter('category')}>
            <option value="">All categories</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select aria-label="Priority" value={filters.priority} onChange={onFilter('priority')}>
            <option value="">All priorities</option>
            {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <select aria-label="Assigned" value={filters.assigned} onChange={onFilter('assigned')}>
            <option value="">Anyone</option>
            <option value="me">Assigned to me</option>
            <option value="unassigned">Unassigned</option>
          </select>
          <span className="date-range">
            <input aria-label="From date" type="date" value={filters.from} onChange={onFilter('from')} />
            to
            <input aria-label="To date" type="date" value={filters.to} onChange={onFilter('to')} />
          </span>
          <span className="toolbar-spacer" />
          {filtered && (
            <button type="button" className="btn btn-ghost btn-small" onClick={() => { setFilters({ ...DEFAULT_FILTERS, status: filters.status }); setPage(1); }}>
              <Icon name="x" size={14} /> Clear filters
            </button>
          )}
        </div>

        <ErrorBanner error={error} onRetry={reload} />
        {loading && !data && <Spinner label="Loading tickets…" />}
        {data && data.tickets.length === 0 && (
          <EmptyState icon="checkCircle" title="No tickets match">
            {filters.status === 'Pending' && !filtered ? 'The queue is clear. Nice work.' : 'Try changing or clearing the filters.'}
          </EmptyState>
        )}

        {data?.tickets.length > 0 && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Priority</th>
                  <th>Ticket</th>
                  <th>Category</th>
                  <th>Author</th>
                  <th>Status · Age</th>
                  <th>Assignee</th>
                </tr>
              </thead>
              <tbody>
                {data.tickets.map((t) => {
                  const late = isOverdue(t);
                  return (
                    <tr key={t._id} className={t.priority === 'Critical' ? 'row-critical' : ''} onClick={() => navigate(`/admin/tickets/${t._id}`)}>
                      <td><PriorityBadge priority={t.priority} /></td>
                      <td>
                        <span className="cell-title" title={t.subject}>{t.subject}</span>
                        <span className="cell-sub">{t.book?.title ?? 'General / Account'} · {formatDate(t.createdAt)}</span>
                      </td>
                      <td>
                        <CategoryLabel category={t.category} />
                        <span className="cell-sub"><SourceTag source={t.classificationSource} /></span>
                      </td>
                      <td>
                        <span className="person">
                          <span className="avatar avatar-sm" aria-hidden="true">{initials(t.author?.name)}</span>
                          <span className="person-text">
                            <strong>{t.author?.name}</strong>
                            <span>{t.author?.authorId}</span>
                          </span>
                        </span>
                      </td>
                      <td>
                        <StatusBadge status={t.status} />
                        <span className="cell-sub">
                          <span className={`age ${late ? 'age-overdue' : ''}`} title={late ? 'Overdue for its priority' : 'Time since opened'}>
                            <Icon name={late ? 'alert' : 'clock'} size={13} />{formatAge(t.createdAt)}
                          </span>
                        </span>
                      </td>
                      <td>
                        {t.assignedTo ? (
                          <span className="person">
                            <span className="avatar avatar-sm avatar-staff" aria-hidden="true">{initials(t.assignedTo.name)}</span>
                            <span className="person-text"><strong>{t.assignedTo.name}</strong></span>
                          </span>
                        ) : (
                          <span className="unassigned">Unassigned</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {data && data.total > 0 && (
          <div className="table-foot">
            <span>Page {data.page} of {Math.max(1, data.pages)} · {data.total} ticket{data.total === 1 ? '' : 's'}</span>
            {data.pages > 1 && (
              <div className="page-btns">
                <button type="button" className="btn btn-small" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  <Icon name="arrowLeft" size={14} /> Previous
                </button>
                <button type="button" className="btn btn-small" disabled={page >= data.pages} onClick={() => setPage((p) => p + 1)}>
                  Next <Icon name="arrowRight" size={14} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
