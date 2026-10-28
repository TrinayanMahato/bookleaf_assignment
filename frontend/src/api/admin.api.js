import { request, toQuery } from './client';

export const listTickets = (filters) => request(`/api/admin/tickets${toQuery(filters)}`);
export const getTicket = (id) => request(`/api/admin/tickets/${id}`);
export const updateTicket = (id, changes) => request(`/api/admin/tickets/${id}`, { method: 'PATCH', body: changes });
export const addNote = (id, body) => request(`/api/admin/tickets/${id}/notes`, { method: 'POST', body: { body } });
export const generateDraft = (id) => request(`/api/admin/tickets/${id}/draft`, { method: 'POST' });
export const sendReply = (id, body, aiDrafted) =>
  request(`/api/admin/tickets/${id}/replies`, { method: 'POST', body: { body, aiDrafted } });
export const getAiUsage = (filters) => request(`/api/admin/ai-usage${toQuery(filters)}`);
