import { formatDateTime, initials } from '../../utils/format';

// The original query followed by every reply, as a timeline. `viewer` decides who is "You".
export default function MessageThread({ ticket, viewer }) {
  const authorName = viewer === 'author' ? 'You' : (ticket.author?.name ?? 'Author');
  const items = [
    { _id: 'original', senderModel: 'Author', body: ticket.description, createdAt: ticket.createdAt, original: true },
    ...(ticket.messages ?? []),
  ];

  return (
    <ol className="thread">
      {items.map((m) => {
        const staff = m.senderModel === 'Admin';
        const name = staff ? (m.sender?.name ?? 'BookLeaf Support') : authorName;
        return (
          <li key={m._id} className={`msg ${staff ? 'msg-staff' : ''}`}>
            <span className={`avatar ${staff ? 'avatar-staff' : ''}`} aria-hidden="true">
              {staff ? 'BL' : initials(ticket.author?.name ?? 'You')}
            </span>
            <div className="msg-content">
              <div className="msg-meta">
                <strong>{name}</strong>
                <span>{staff ? 'BookLeaf Support' : m.original ? 'opened the ticket' : 'replied'}</span>
                <span className="sep">·</span>
                <span>{formatDateTime(m.createdAt)}</span>
              </div>
              <p className="msg-bubble">{m.body}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
