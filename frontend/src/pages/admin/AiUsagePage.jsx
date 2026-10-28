import { useState } from 'react';
import { Link } from 'react-router-dom';
import { getAiUsage } from '../../api/admin.api';
import useAsync from '../../hooks/useAsync';
import { EmptyState, ErrorBanner, Spinner } from '../../components/ui/Feedback';
import { Tag } from '../../components/ui/Badge';
import Icon from '../../components/ui/Icon';
import StatCard from '../../components/ui/StatCard';
import { formatDateTime } from '../../utils/format';

const ACTION_TABS = [
  ['', 'All calls'],
  ['classify', 'Classification'],
  ['draft', 'Reply drafts'],
];

const num = (n) => Math.round(n ?? 0).toLocaleString('en-IN');
const perCall = (group) => (group.calls - group.failed ? group.totalTokens / (group.calls - group.failed) : 0);

export default function AiUsagePage() {
  const [action, setAction] = useState('');
  const [page, setPage] = useState(1);
  const { data, error, loading, reload } = useAsync(() => getAiUsage({ action, page }), [action, page]);
  const s = data?.summary;

  const pick = (value) => {
    setAction(value);
    setPage(1);
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h1>AI usage</h1>
          <p>Every Gemini request, including retries and fallbacks, with the tokens it used.</p>
        </div>
        <div className="page-actions">
          <button type="button" className="btn" onClick={() => reload()}><Icon name="refresh" size={15} /> Refresh</button>
        </div>
      </div>

      <ErrorBanner error={error} onRetry={reload} />
      {loading && !data && <Spinner label="Loading AI usage…" />}

      {s && (
        <div className="stats">
          <StatCard icon="zap" tone="brand" label="Requests" value={num(s.calls)} hint={`${num(s.failed)} failed and retried`} />
          <StatCard icon="layers" tone="ai" label="Total tokens" value={num(s.totalTokens)} hint={`${num(s.promptTokens)} in · ${num(s.outputTokens)} out`} />
          <StatCard icon="sparkles" tone="warn" label="Thinking tokens" value={num(s.thinkingTokens)} hint="Billed as output" />
          <StatCard icon="clock" tone="blue" label="Avg latency" value={`${(s.avgLatencyMs / 1000).toFixed(1)}s`} hint="Per request" />
        </div>
      )}

      {s?.byAction.length > 0 && (
        <div className="usage-split">
          {s.byAction.map((g) => (
            <div key={g.key} className="card card-body">
              <div className="card-title">
                <h3><Icon name={g.key === 'draft' ? 'pen' : 'sparkles'} size={15} /> {g.key === 'draft' ? 'Reply drafts' : 'Classification'}</h3>
                <span className="muted small">{num(g.calls)} request{g.calls === 1 ? '' : 's'}</span>
              </div>
              <dl className="facts">
                <div><dt>Avg tokens / success</dt><dd>{num(perCall(g))}</dd></div>
                <div><dt>Total tokens</dt><dd>{num(g.totalTokens)}</dd></div>
                <div><dt>Prompt / output</dt><dd>{num(g.promptTokens)} / {num(g.outputTokens)}</dd></div>
                <div><dt>Failed attempts</dt><dd className={g.failed ? 'warn' : ''}>{num(g.failed)}</dd></div>
              </dl>
            </div>
          ))}
        </div>
      )}

      <div className="card card-flush">
        <div className="card-header">
          <div className="tabs" role="tablist">
            {ACTION_TABS.map(([value, label]) => (
              <button key={label} type="button" role="tab" aria-selected={action === value} className={`tab ${action === value ? 'active' : ''}`} onClick={() => pick(value)}>
                {label}
                {action === value && data && <span className="tab-count">{data.total}</span>}
              </button>
            ))}
          </div>
        </div>

        {data && data.calls.length === 0 && (
          <EmptyState icon="zap" title="No AI calls yet">Calls appear here when a ticket is created or a draft is generated.</EmptyState>
        )}

        {data?.calls.length > 0 && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>When</th>
                  <th>Action</th>
                  <th>Ticket</th>
                  <th>Model</th>
                  <th>Result</th>
                  <th className="num">Prompt</th>
                  <th className="num">Output</th>
                  <th className="num">Thinking</th>
                  <th className="num">Total</th>
                  <th className="num">Time</th>
                </tr>
              </thead>
              <tbody>
                {data.calls.map((c) => (
                  <tr key={c._id} className="row-static">
                    <td className="nowrap">{formatDateTime(c.createdAt)}</td>
                    <td>{c.action === 'draft' ? <Tag tone="ai" icon="pen">Draft</Tag> : <Tag icon="sparkles">Classify</Tag>}</td>
                    <td>
                      {c.ticket ? (
                        <Link to={`/admin/tickets/${c.ticket._id}`} className="cell-title" title={c.ticket.subject}>{c.ticket.subject}</Link>
                      ) : (
                        <span className="muted small">Deleted ticket</span>
                      )}
                      {c.admin && <span className="cell-sub">by {c.admin.name}</span>}
                    </td>
                    <td className="nowrap">
                      {c.model}
                      {c.attempt > 1 && <span className="cell-sub">attempt {c.attempt}</span>}
                    </td>
                    <td>
                      {c.success ? (
                        <Tag tone="success" icon="check">OK</Tag>
                      ) : (
                        <span title={c.errorMessage ?? ''}><Tag tone="danger" icon="alert">{c.errorStatus ?? 'Error'}</Tag></span>
                      )}
                    </td>
                    <td className="num">{num(c.promptTokens)}</td>
                    <td className="num">{num(c.outputTokens)}</td>
                    <td className="num">{num(c.thinkingTokens)}</td>
                    <td className="num strong">{num(c.totalTokens)}</td>
                    <td className="num">{(c.latencyMs / 1000).toFixed(1)}s</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {data && data.total > 0 && (
          <div className="table-foot">
            <span>Page {data.page} of {Math.max(1, data.pages)} · {data.total} request{data.total === 1 ? '' : 's'}</span>
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
