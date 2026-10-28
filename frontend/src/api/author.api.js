import { request } from './client';

export const getMyBooks = (authorId) => request(`/api/authors/${authorId}/books`);
export const getMyTickets = (authorId) => request(`/api/authors/${authorId}/tickets`);
