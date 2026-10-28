import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getMyBooks } from '../../api/author.api';
import { createTicket } from '../../api/tickets.api';
import useAuth from '../../hooks/useAuth';
import useAsync from '../../hooks/useAsync';
import FieldError from '../../components/ui/FieldError';
import { ErrorBanner } from '../../components/ui/Feedback';
import Icon from '../../components/ui/Icon';
import { ALLOWED_FILE_TYPES, MAX_FILE_SIZE, MAX_FILES } from '../../utils/constants';
import { formatFileSize } from '../../utils/format';

const TIPS = [
  'Mention the book, platform and dates involved.',
  'For royalty questions, include the quarter you are asking about.',
  'Attach photos for print-quality issues, or screenshots of listings.',
];

const NEXT_STEPS = [
  ['We sort it', 'Your query is categorised and prioritised automatically.'],
  ['A specialist replies', 'Usually within 48 hours, faster for urgent issues.'],
  ['You get notified', 'The reply appears instantly in My Tickets.'],
];

export default function NewTicketPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const books = useAsync(() => getMyBooks(user.authorId), [user.authorId]);
  const [form, setForm] = useState({ bookId: params.get('book') ?? '', subject: '', description: '' });
  const [files, setFiles] = useState([]);
  const [fileError, setFileError] = useState(null);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  // Mirrors the backend multer limits so authors find out before uploading.
  const addFiles = (e) => {
    const picked = Array.from(e.target.files);
    e.target.value = '';
    const bad = picked.find((f) => !ALLOWED_FILE_TYPES.includes(f.type) || f.size > MAX_FILE_SIZE);
    if (bad) return setFileError(`"${bad.name}" must be a JPG, PNG, WEBP or PDF of 2 MB or less.`);
    if (files.length + picked.length > MAX_FILES) return setFileError(`You can attach up to ${MAX_FILES} files.`);
    setFileError(null);
    setFiles((prev) => [...prev, ...picked]);
  };

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await createTicket({ ...form, files });
      navigate('/author/tickets', { state: { created: form.subject } });
    } catch (err) {
      setError(err);
      setSubmitting(false);
    }
  };

  const descLength = form.description.trim().length;
  const full = files.length >= MAX_FILES;

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Raise a support query</h1>
          <p>Tell us what's going on and our team will get back to you.</p>
        </div>
      </div>

      <div className="form-layout">
        <form className="card form-card form" onSubmit={submit} noValidate>
          {error && !error.details && <ErrorBanner error={error} />}

          <div className="field">
            <label htmlFor="bookId">Which book is this about?</label>
            <select id="bookId" value={form.bookId} onChange={update('bookId')} disabled={books.loading}>
              <option value="" disabled>{books.loading ? 'Loading your books…' : 'Select a book'}</option>
              <option value="general">General / Account Level</option>
              {books.data?.books.map((b) => (
                <option key={b.bookId} value={b.bookId}>{b.title}</option>
              ))}
            </select>
            <FieldError details={error?.details} name="bookId" />
          </div>

          <div className="field">
            <label htmlFor="subject">Subject</label>
            <input id="subject" maxLength={200} placeholder="e.g. Royalty not received for last quarter" value={form.subject} onChange={update('subject')} />
            <FieldError details={error?.details} name="subject" />
          </div>

          <div className="field">
            <div className="label-row">
              <label htmlFor="description">Describe the issue</label>
              <span className="hint">{descLength}/5000</span>
            </div>
            <textarea id="description" rows={7} maxLength={5000} placeholder="Include dates, amounts, platform names or anything that helps us look into it." value={form.description} onChange={update('description')} />
            {descLength < 20 && <span className="hint">At least 20 characters</span>}
            <FieldError details={error?.details} name="description" />
          </div>

          <div className="field">
            <div className="label-row">
              <label htmlFor="files">Attachments <span className="optional">Optional</span></label>
              <span className="hint">{files.length}/{MAX_FILES}</span>
            </div>
            <div className={`dropzone ${full ? 'disabled' : ''}`}>
              <input id="files" type="file" multiple accept={ALLOWED_FILE_TYPES.join(',')} onChange={addFiles} disabled={full} />
              <span className="dropzone-icon"><Icon name="upload" size={18} /></span>
              <strong>{full ? 'Attachment limit reached' : 'Click to upload or drag files here'}</strong>
              <span>JPG, PNG, WEBP or PDF · up to 2 MB each</span>
            </div>
            {fileError && <p className="field-error">{fileError}</p>}
            {files.length > 0 && (
              <ul className="file-list">
                {files.map((f, i) => (
                  <li key={`${f.name}-${i}`}>
                    <Icon name={f.type === 'application/pdf' ? 'file' : 'paperclip'} size={16} />
                    <span className="file-name">{f.name}</span>
                    <span className="muted small">{formatFileSize(f.size)}</span>
                    <button type="button" className="btn btn-ghost btn-small" onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))} aria-label={`Remove ${f.name}`}>
                      <Icon name="x" size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="form-actions">
            <button type="button" className="btn" onClick={() => navigate(-1)} disabled={submitting}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={submitting || !form.bookId}>
              {submitting ? <><span className="spinner" aria-hidden="true" /> Submitting…</> : <><Icon name="send" size={15} /> Submit query</>}
            </button>
          </div>
        </form>

        <aside className="aside-stack">
          <div className="card card-body">
            <h3 className="form-section-title">Tips for a faster answer</h3>
            <ul className="tips">
              {TIPS.map((t) => (
                <li key={t}><Icon name="check" size={15} />{t}</li>
              ))}
            </ul>
          </div>
          <div className="card card-body">
            <h3 className="form-section-title">What happens next</h3>
            <ol className="timeline">
              {NEXT_STEPS.map(([title, text], i) => (
                <li key={title}>
                  <span className="timeline-n">{i + 1}</span>
                  <div><strong>{title}</strong><span>{text}</span></div>
                </li>
              ))}
            </ol>
          </div>
        </aside>
      </div>
    </>
  );
}
