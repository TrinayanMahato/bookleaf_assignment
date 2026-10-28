import { useState } from 'react';
import { openAttachment } from '../../api/tickets.api';
import { formatFileSize } from '../../utils/format';
import Icon from '../ui/Icon';

export default function AttachmentList({ ticketId, attachments }) {
  const [error, setError] = useState(null);
  if (!attachments?.length) return null;

  const open = async (filename) => {
    setError(null);
    try {
      await openAttachment(ticketId, filename);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <>
      <div className="attachments">
        {attachments.map((a) => (
          <button key={a.filename} type="button" className="attachment" onClick={() => open(a.filename)} title={`Open ${a.originalName}`}>
            <Icon name={a.mimetype === 'application/pdf' ? 'file' : 'paperclip'} size={15} />
            <span>{a.originalName}</span>
            <span className="size">{formatFileSize(a.size)}</span>
          </button>
        ))}
      </div>
      {error && <p className="field-error">{error}</p>}
    </>
  );
}
