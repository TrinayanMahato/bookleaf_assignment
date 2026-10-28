import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMyBooks } from '../../api/author.api';
import { createTicket } from '../../api/tickets.api';
import useAuth from '../../hooks/useAuth';
import useAsync from '../../hooks/useAsync';
import FieldError from '../../components/ui/FieldError';
import { ErrorBanner } from '../../components/ui/Feedback';
import { ALLOWED_FILE_TYPES, MAX_FILE_SIZE, MAX_FILES } from '../../utils/constants';
import { formatFileSize } from '../../utils/format';

export default function NewTicketPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const books = useAsync(() => getMyBooks(user.authorId), [user.authorId]);
  const [form, setForm] = useState({ bookId: '', subject: '', description: '' });
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

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Raise a support query</h1>
          <p>Our team usually replies within 48 hours. Urgent issues are prioritised automatically.</p>
        </div>
      </div>

      <form className="card form" onSubmit={submit} noValidate style={{ maxWidth: 720 }}>
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
          <label htmlFor="description">Describe the issue</label>
          <textarea id="description" maxLength={5000} placeholder="Include dates, amounts, platform names or anything that helps us look into it." value={form.description} onChange={update('description')} />
          <span className="hint">{form.description.trim().length}/5000 · at least 20 characters</span>
          <FieldError details={error?.details} name="description" />
        </div>

        <div className="field">
          <label htmlFor="files">Attachments (optional)</label>
          <input id="files" type="file" multiple accept={ALLOWED_FILE_TYPES.join(',')} onChange={addFiles} disabled={files.length >= MAX_FILES} />
          <span className="hint">Up to {MAX_FILES} files · JPG, PNG, WEBP or PDF · 2 MB each. Photos help with print-quality issues.</span>
          {fileError && <p className="field-error">{fileError}</p>}
          {files.length > 0 && (
            <ul className="file-list">
              {files.map((f, i) => (
                <li key={`${f.name}-${i}`}>
                  <span>{f.name} <span className="muted">({formatFileSize(f.size)})</span></span>
                  <button type="button" className="btn btn-ghost btn-small" onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}>Remove</button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="form-actions">
          <button type="button" className="btn" onClick={() => navigate(-1)} disabled={submitting}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={submitting || !form.bookId}>
            {submitting ? 'Submitting… this can take a few seconds' : 'Submit query'}
          </button>
        </div>
      </form>
    </>
  );
}
