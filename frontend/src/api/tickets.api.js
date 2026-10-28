import { request } from './client';

// Sent as multipart/form-data because of the optional attachments.
export const createTicket = ({ bookId, subject, description, files }) => {
  const form = new FormData();
  form.append('bookId', bookId);
  form.append('subject', subject);
  form.append('description', description);
  files.forEach((file) => form.append('attachments', file));
  return request('/api/tickets', { method: 'POST', formData: form });
};

// Attachments are behind auth, so fetch them with the token and open a blob URL.
export const openAttachment = async (ticketId, filename) => {
  const res = await request(`/api/tickets/${ticketId}/attachments/${filename}`, { raw: true });
  const url = URL.createObjectURL(await res.blob());
  window.open(url, '_blank', 'noopener');
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
};
