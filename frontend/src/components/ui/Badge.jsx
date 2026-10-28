const slug = (value) => value.toLowerCase().replace(/[^a-z]+/g, '-');

export const StatusBadge = ({ status }) => <span className={`badge status-${slug(status)}`}>{status}</span>;

export const PriorityBadge = ({ priority }) => <span className={`badge priority-${slug(priority)}`}>{priority}</span>;

export const Tag = ({ children, tone = 'neutral' }) => <span className={`tag tag-${tone}`}>{children}</span>;
