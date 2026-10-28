// Mirrors the backend enums in models/Ticket.js.
// Set automatically by the backend: Pending on creation, Answered after an admin reply.
export const STATUSES = ['Pending', 'Answered'];
export const PRIORITIES = ['Critical', 'High', 'Medium', 'Low'];
export const CATEGORIES = [
  'Royalty & Payments',
  'ISBN & Metadata Issues',
  'Printing & Quality',
  'Distribution & Availability',
  'Book Status & Production Updates',
  'General Inquiry',
];

// Hours after which an unresolved ticket counts as overdue (KB promises 24-48h on urgent issues).
export const OVERDUE_HOURS = { Critical: 24, High: 48, Medium: 72, Low: 120 };

export const MAX_FILES = 3;
export const MAX_FILE_SIZE = 2 * 1024 * 1024;
export const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
