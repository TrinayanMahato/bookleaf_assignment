// Mirrors the backend enums in models/Ticket.js.
// Mirrors models/Ticket.js: Open on creation, In Progress when assigned, Resolved after a reply; admins can set any.
export const STATUSES = ['Open', 'In Progress', 'Resolved', 'Closed'];
export const ACTIVE_STATUSES = ['Open', 'In Progress']; // still waiting on the team
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

// Production stages from the Knowledge Base, in order; a book's status is "In Production - <stage>".
export const PRODUCTION_STAGES = [
  'Manuscript Received',
  'Editing',
  'Cover Design',
  'Typesetting',
  'Proofreading',
  'ISBN Assignment',
  'Printing',
  'Distribution Setup',
  'Published & Live',
];
