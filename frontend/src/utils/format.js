import { ACTIVE_STATUSES, OVERDUE_HOURS } from './constants';

const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

export const formatMoney = (value) => (value === null || value === undefined ? '—' : inr.format(value));

export const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

export const formatDateTime = (value) =>
  value ? new Date(value).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '—';

// "3d 4h", "5h", "12m"
export const formatAge = (value) => {
  const mins = Math.max(0, Math.floor((Date.now() - new Date(value)) / 60_000));
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d ${hours % 24}h`;
};

export const isOverdue = (ticket) =>
  ACTIVE_STATUSES.includes(ticket.status) &&
  (Date.now() - new Date(ticket.createdAt)) / 3_600_000 > OVERDUE_HOURS[ticket.priority];

export const formatFileSize = (bytes) => (bytes < 1024 * 1024 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`);

// "Sneha Kulkarni" → "SK"
export const initials = (name = '') =>
  name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
