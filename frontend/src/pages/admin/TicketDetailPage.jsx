import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { addNote, generateDraft, getTicket, sendReply, updateTicket } from '../../api/admin.api';
import useAuth from '../../hooks/useAuth';
import useAsync from '../../hooks/useAsync';
import useEventStream from '../../hooks/useEventStream';
import { ErrorBanner, Notice, Spinner } from '../../components/ui/Feedback';
import { PriorityBadge, SourceTag, StatusBadge, Tag } from '../../components/ui/Badge';
import FieldError from '../../components/ui/FieldError';
import Icon from '../../components/ui/Icon';
import CategoryLabel from '../../components/tickets/CategoryLabel';
import MessageThread from '../../components/tickets/MessageThread';
import AttachmentList from '../../components/tickets/AttachmentList';
import { CATEGORIES, PRIORITIES, STATUSES } from '../../utils/constants';
import { formatAge, formatDate, formatDateTime, formatMoney, initials } from '../../utils/format';

function ReplyComposer({ ticket, onSent }) {
  const [body, setBody] = useState(ticket.aiDraft?.body ?? '');
  const [fromDraft, setFromDraft] = useState(Boolean(ticket.aiDraft?.body));
  const [drafting, setDrafting] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(ticket.aiDraft?.body ? `AI draft from ${formatDateTime(ticket.aiDraft.generatedAt)} loaded. Review before sending.` : null);

  const draft = async () => {
    if (body.trim() && !window.confirm('Replace what you have written with a new AI draft?')) return;
    setError(null);
    setDrafting(true);
    try {
      const { draft: d } = await generateDraft(ticket._id);
      setBody(d.body);
      setFromDraft(true);
      setInfo('AI draft ready. Check the facts and tone, edit as needed, then send.');
    } catch (err) {
      setError(err); // 503 means the AI is down: the textarea stays usable for a manual reply
    } finally {
      setDrafting(false);
    }
  };

  const send = async () => {
    setError(null);
    setSending(true);
    try {
      const { delivered } = await sendReply(ticket._id, body, fromDraft);
      setBody('');
      setFromDraft(false);
      setInfo(delivered ? 'Reply sent. The author saw it instantly.' : 'Reply sent. The author will see it next time they open their tickets.');
      onSent();
    } catch (err) {
      setError(err);
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="card card-flush">
      <div className="card-header">
        <div>
          <h2><Icon name="send" size={16} /> Reply to author</h2>
          <p>Uses the BookLeaf knowledge base and this author's book data.</p>
        </div>
        <button type="button" className="btn btn-ai btn-small" onClick={draft} disabled={drafting || sending}>
          <Icon name="sparkles" size={15} /> {drafting ? 'Drafting…' : body.trim() ? 'Regenerate draft' : 'Generate AI draft'}
        </button>
      </div>
      <div className="card-body">
        {info && !error && <Notice tone={fromDraft ? 'ai' : 'success'}>{info}</Notice>}
        {error && !error.details && <ErrorBanner error={error} />}
        <div className={`composer-box ${drafting ? 'drafting' : ''}`}>
          <textarea
            aria-label="Reply"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={drafting ? 'Writing a draft from the knowledge base… this can take up to 30 seconds.' : 'Write a reply, or generate an AI draft to start from.'}
            disabled={drafting}
          />
          <div className="composer-foot">
            <span className="left">
              {fromDraft ? <Tag tone="ai" icon="sparkles">Started from AI draft</Tag> : <span>Written manually</span>}
              <span>{body.trim().length} characters</span>
            </span>
            <button type="button" className="btn btn-primary" onClick={send} disabled={sending || drafting || !body.trim()}>
              <Icon name="send" size={15} /> {sending ? 'Sending…' : 'Send reply'}
            </button>
          </div>
        </div>
        <FieldError details={error?.details} name="body" />
      </div>
    </section>
  );
}

function BookFacts({ book }) {
  if (!book) return <p className="muted small">General / account-level query, no book attached.</p>;
  const live = book.status === 'Published & Live';
  return (
    <dl className="facts">
      <div className="wide"><dt>Title</dt><dd>{book.title}</dd></div>
      <div><dt>ISBN</dt><dd>{book.isbn ?? 'Not assigned'}</dd></div>
      <div><dt>Status</dt><dd>{live ? 'Published & Live' : book.status.replace('In Production - ', 'In production · ')}</dd></div>
      {live && (
        <>
          <div><dt>Copies sold</dt><dd>{book.totalCopiesSold.toLocaleString('en-IN')}</dd></div>
          <div><dt>MRP</dt><dd>{formatMoney(book.mrp)}</dd></div>
          <div><dt>Royalty earned</dt><dd>{formatMoney(book.totalRoyaltyEarned)}</dd></div>
          <div><dt>Paid</dt><dd>{formatMoney(book.royaltyPaid)}</dd></div>
          <div><dt>Pending</dt><dd className={book.royaltyPending > 0 ? 'warn' : ''}>{formatMoney(book.royaltyPending)}</dd></div>
          <div><dt>Last payout</dt><dd>{book.lastRoyaltyPayoutDate ? formatDate(book.lastRoyaltyPayoutDate) : 'Never'}</dd></div>
          <div className="wide"><dt>Print partner</dt><dd>{book.printPartner}</dd></div>
          <div className="wide"><dt>Available on</dt><dd>{book.availableOn.join(', ')}</dd></div>
        </>
      )}
    </dl>
  );
}

export default function TicketDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const { data, error, loading, reload, setData } = useAsync(() => getTicket(id), [id]);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [note, setNote] = useState('');

  // Another admin changing this ticket refreshes it here (composer text is kept).
  useEventStream({ 'ticket:changed': ({ ticketId }) => ticketId === id && reload({ silent: true }) });

  const ticket = data?.ticket;
  if (loading && !ticket) return <Spinner label="Loading ticket…" />;
  if (error && !ticket) return <ErrorBanner error={error} onRetry={reload} />;
  if (!ticket) return null;

  const change = async (changes) => {
    setActionError(null);
    setSaving(true);
    try {
      const updated = await updateTicket(ticket._id, changes);
      setData(() => updated);
    } catch (err) {
      setActionError(err);
    } finally {
      setSaving(false);
    }
  };

  const saveNote = async (e) => {
    e.preventDefault();
    setActionError(null);
    try {
      const { internalNotes } = await addNote(ticket._id, note);
      setData((d) => ({ ticket: { ...d.ticket, internalNotes } }));
      setNote('');
    } catch (err) {
      setActionError(err);
    }
  };

  const assignedToMe = ticket.assignedTo?._id === user.id;
  const manual = ticket.classificationSource === 'admin';

  return (
    <>
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link to="/admin/tickets"><Icon name="arrowLeft" size={14} /> Ticket queue</Link>
        <Icon name="chevronRight" size={14} />
        <span>{ticket.author.name}</span>
      </nav>

      <div className="detail-header">
        <div>
          <h1>{ticket.subject}</h1>
          <div className="meta-row">
            <PriorityBadge priority={ticket.priority} />
            <StatusBadge status={ticket.status} />
            <CategoryLabel category={ticket.category} />
            <span className="sep">·</span>
            <span>Opened {formatDateTime(ticket.createdAt)} ({formatAge(ticket.createdAt)} ago)</span>
          </div>
        </div>
      </div>
      <ErrorBanner error={actionError} />

      <div className="detail">
        <div className="detail-main">
          <section className="card card-flush">
            <div className="card-header">
              <h2><Icon name="message" size={16} /> Conversation</h2>
              <span className="muted small">{ticket.messages.length} repl{ticket.messages.length === 1 ? 'y' : 'ies'}</span>
            </div>
            <div className="card-body">
              <AttachmentList ticketId={ticket._id} attachments={ticket.attachments} />
              <MessageThread ticket={ticket} viewer="admin" />
            </div>
          </section>
          <ReplyComposer key={ticket._id} ticket={ticket} onSent={() => reload({ silent: true })} />
        </div>

        <aside className="side">
          <section className="card card-body">
            <div className="card-title"><h3><Icon name="layers" size={15} /> Properties</h3></div>
            <div className="props">
              <div className="prop">
                <label className="prop-label" htmlFor="d-status">Status</label>
                <select id="d-status" value={ticket.status} disabled={saving} onChange={(e) => change({ status: e.target.value })}>
                  {STATUSES.map((s) => <option key={s}>{s}</option>)}
                </select>
                <span className="muted small">Assigning sets In Progress and replying sets Resolved automatically.</span>
              </div>
              <div className="prop">
                <label className="prop-label" htmlFor="d-priority">Priority</label>
                <select id="d-priority" value={ticket.priority} disabled={saving} onChange={(e) => change({ priority: e.target.value })}>
                  {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div className="prop">
                <label className="prop-label" htmlFor="d-category">Category</label>
                <select id="d-category" value={ticket.category} disabled={saving} onChange={(e) => change({ category: e.target.value })}>
                  {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className={`ai-reason ${ticket.classificationSource === 'ai' ? '' : 'manual'}`}>
                <Icon name={ticket.classificationSource === 'ai' ? 'sparkles' : manual ? 'user' : 'info'} size={15} />
                <div>
                  <SourceTag source={ticket.classificationSource} />{' '}
                  {ticket.classificationReason ?? (manual ? 'Set manually by an admin.' : 'No classification note.')}
                </div>
              </div>
              <div className="prop">
                <span className="prop-label">Assignee</span>
                <div className="assignee">
                  {ticket.assignedTo ? (
                    <span className="person">
                      <span className="avatar avatar-sm avatar-staff" aria-hidden="true">{initials(ticket.assignedTo.name)}</span>
                      <span className="person-text"><strong>{ticket.assignedTo.name}{assignedToMe && ' (you)'}</strong></span>
                    </span>
                  ) : (
                    <span className="unassigned">Nobody yet</span>
                  )}
                  <button type="button" className="btn btn-small" disabled={saving} onClick={() => change({ assignedTo: assignedToMe ? null : 'me' })}>
                    <Icon name={assignedToMe ? 'x' : 'userCheck'} size={14} /> {assignedToMe ? 'Unassign' : 'Assign to me'}
                  </button>
                </div>
              </div>
            </div>
          </section>

          <section className="card card-body">
            <div className="card-title"><h3><Icon name="user" size={15} /> Author</h3></div>
            <div className="contact">
              <span className="avatar avatar-lg" aria-hidden="true">{initials(ticket.author.name)}</span>
              <div>
                <strong>{ticket.author.name}</strong>
                <span>{ticket.author.authorId}</span>
              </div>
            </div>
            <ul className="info-list">
              <li><Icon name="mail" size={15} /><span>{ticket.author.email}</span></li>
              <li><Icon name="mapPin" size={15} /><span>{ticket.author.city}</span></li>
            </ul>
          </section>

          <section className="card card-body">
            <div className="card-title"><h3><Icon name="book" size={15} /> Book</h3></div>
            <BookFacts book={ticket.book} />
          </section>

          <section className="card card-body">
            <div className="card-title">
              <h3><Icon name="note" size={15} /> Internal notes</h3>
              <Tag icon="lock">Staff only</Tag>
            </div>
            {ticket.internalNotes?.length > 0 && (
              <ul className="notes">
                {ticket.internalNotes.map((n) => (
                  <li key={n._id}>
                    <span className="note-meta">{n.admin?.name} · {formatDateTime(n.createdAt)}</span>
                    {n.body}
                  </li>
                ))}
              </ul>
            )}
            <form onSubmit={saveNote} className="note-form">
              <textarea aria-label="New internal note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Checked with finance, payout batch failed" />
              <button type="submit" className="btn btn-small" disabled={!note.trim()}>Add note</button>
            </form>
          </section>
        </aside>
      </div>
    </>
  );
}
