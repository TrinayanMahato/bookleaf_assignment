import { request } from './client';

export const loginAuthor = (credentials) => request('/api/auth/author/login', { method: 'POST', body: credentials });
export const loginAdmin = (credentials) => request('/api/auth/admin/login', { method: 'POST', body: credentials });
