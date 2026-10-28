import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { addNote, generateDraft, getTicket, sendReply, updateTicket } from '../../api/admin.api';
import useAuth from '../../hooks/useAuth';
import useAsync from '../../hooks/useAsync';
import useEventStream from '../../hooks/useEventStream';
import { ErrorBanner, Notice, Spinner } from '../../components/ui/Feedback';
import { PriorityBadge, StatusBadge, Tag } from '../../components/ui/Badge';
import FieldError from '../../components/ui/FieldError';
import MessageThread from '../../components/tickets/MessageThread';
import AttachmentList from '../../components/tickets/AttachmentList';
import { CATEGORIES, PRIORITIES } from '../../utils/constants';
import { formatAge, formatDate, formatDateTime, formatMoney } from '../../utils/format';

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
    <div className="card composer">
      <div className="card-title">
        <h2>Reply to author</h2>
        <button type="button" className="btn btn-small" onClick={draft} disabled={drafting || sending}>
          {drafting ? '✨ Drafting… (up to 30s)' : '✨ Generate AI draft'}
        </button>
      </div>
      {info && !error && <Notice tone="info">{info}</Notice>}
      {error && !error.details && <ErrorBanner error={error} />}
      <div className="field">
        <textarea
          aria-label="Reply"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write a reply, or generate an AI draft based on the BookLeaf knowledge base and this author's data."
          disabled={drafting}
        />
        <FieldError details={error?.details} name="body" />
      </div>
      <div className="form-actions">
        {fromDraft && <span className="muted small" style={{ marginRight: 'auto' }}>Started from AI draft</span>}
        <button type="button" className="btn btn-primary" onClick={send} disabled={sending || drafting || !body.trim()}>
          {sending ? 'Sending…' : 'Send reply'}
        </button>
      </div>
    </div>
  );
}

function BookFacts({ book }) {
  if (!book) return <p className="muted small">General / account-level query.</p>;
  const live = book.status === 'Published & Live';
  return (
    <>
      <div className="kv"><span>Book</span><strong>{book.title}</strong></div>
      <div className="kv"><span>ISBN</span>{book.isbn ?? 'Not assigned'}</div>
      <div className="kv"><span>Status</span>{book.status}</div>
      {live && (
        <>
          <div className="kv"><span>Sold / MRP</span>{book.totalCopiesSold} copies · {formatMoney(book.mrp)}</div>
          <div className="kv"><span>Royalty earned / paid / pending</span>{formatMoney(book.totalRoyaltyEarned)} / {formatMoney(book.royaltyPaid)} / <strong>{formatMoney(book.royaltyPending)}</strong></div>
          <div className="kv"><span>Last payout</span>{book.lastRoyaltyPayoutDate ? formatDate(book.lastRoyaltyPayoutDate) : 'Never'}</div>
          <div className="kv"><span>Print partner</span>{book.printPartner}</div>
          <div className="kv"><span>Available on</span>{book.availableOn.join(', ')}</div>
        </>
      )}
    </>
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

  return (
    <>
      <p className="back-row"><Link to="/admin/tickets">← Back to queue</Link></p>
      <div className="page-header">
        <div>
          <h1>{ticket.subject}</h1>
          <div className="ticket-badges">
            <PriorityBadge priority={ticket.priority} />
            <StatusBadge status={ticket.status} />
            <Tag>{ticket.category}</Tag>
            <span className="muted small">Opened {formatDateTime(ticket.createdAt)} · {formatAge(ticket.createdAt)} ago</span>
          </div>
        </div>
      </div>
      <ErrorBanner error={actionError} />

      <div className="detail">
        <div>
          <div className="card">
            <h2>Conversation</h2>
            <AttachmentList ticketId={ticket._id} attachments={ticket.attachments} />
            <MessageThread ticket={ticket} viewer="admin" />
          </div>
          <ReplyComposer key={ticket._id} ticket={ticket} onSent={() => reload({ silent: true })} />
        </div>

        <aside className="side">
          <div className="card">
            <h3>Manage</h3>
            <div className="kv">
              <span>Status</span>
              <span><StatusBadge status={ticket.status} /> <span className="muted small">{ticket.status === 'Pending' ? 'changes to Answered when you reply' : 'set automatically on reply'}</span></span>
            </div>
            <div className="field">
              <label htmlFor="d-priority">Priority</label>
              <select id="d-priority" value={ticket.priority} disabled={saving} onChange={(e) => change({ priority: e.target.value })}>
                {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="d-category">Category</label>
              <select id="d-category" value={ticket.category} disabled={saving} onChange={(e) => change({ category: e.target.value })}>
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="reason">
              {ticket.classificationSource === 'ai' && <Tag tone="ai">AI</Tag>}{' '}
              {ticket.classificationReason ?? 'No classification note.'}
            </div>
            <div className="kv" style={{ marginTop: '0.75rem' }}>
              <span>Assigned to</span>
              {ticket.assignedTo?.name ?? 'Nobody yet'}
            </div>
            <button type="button" className="btn btn-small btn-block" disabled={saving} onClick={() => change({ assignedTo: assignedToMe ? null : 'me' })}>
              {assignedToMe ? 'Unassign me' : 'Assign to me'}
            </button>
          </div>

          <div className="card">
            <h3>Author</h3>
            <div className="kv"><span>Name</span>{ticket.author.name} ({ticket.author.authorId})</div>
            <div className="kv"><span>Email</span>{ticket.author.email}</div>
            <div className="kv"><span>City</span>{ticket.author.city}</div>
            <BookFacts book={ticket.book} />
          </div>

          <div className="card">
            <h3>Internal notes</h3>
            <p className="muted small">Only visible to BookLeaf staff.</p>
            {ticket.internalNotes?.length > 0 && (
              <ul className="notes">
                {ticket.internalNotes.map((n) => (
                  <li key={n._id}>
                    <div className="muted small">{n.admin?.name} · {formatDateTime(n.createdAt)}</div>
                    {n.body}
                  </li>
                ))}
              </ul>
            )}
            <form onSubmit={saveNote} className="form">
              <textarea aria-label="New internal note" style={{ minHeight: 80 }} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Checked with finance, payout batch failed" />
              <button type="submit" className="btn btn-small" disabled={!note.trim()}>Add note</button>
            </form>
          </div>
        </aside>
      </div>
    </>
  );
}
