import { formatDateTime } from '../../utils/format';

// The original query followed by every reply. `viewer` decides which side is "mine".
export default function MessageThread({ ticket, viewer }) {
  const items = [
    { _id: 'original', senderModel: 'Author', body: ticket.description, createdAt: ticket.createdAt, original: true },
    ...(ticket.messages ?? []),
  ];

  return (
    <ol className="thread">
      {items.map((m) => {
        const fromBookLeaf = m.senderModel === 'Admin';
        const mine = viewer === 'admin' ? fromBookLeaf : !fromBookLeaf;
        return (
          <li key={m._id} className={`message ${mine ? 'message-mine' : ''} ${fromBookLeaf ? 'message-bookleaf' : ''}`}>
            <div className="message-meta">
              <strong>{fromBookLeaf ? `${m.sender?.name ?? 'BookLeaf Support'} · BookLeaf` : m.original ? 'Original query' : 'Author'}</strong>
              <span>{formatDateTime(m.createdAt)}</span>
            </div>
            <p className="message-body">{m.body}</p>
          </li>
        );
      })}
    </ol>
  );
}
