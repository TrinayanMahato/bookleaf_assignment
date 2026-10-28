import Icon from './Icon';

const slug = (value) => value.toLowerCase().replace(/[^a-z]+/g, '-');

export const StatusBadge = ({ status }) => <span className={`badge status-${slug(status)}`}>{status}</span>;

export const PriorityBadge = ({ priority }) => <span className={`badge priority-${slug(priority)}`}>{priority}</span>;

export const Tag = ({ children, tone = 'neutral', icon }) => (
  <span className={`tag tag-${tone}`}>
    {icon && <Icon name={icon} size={12} />}
    {children}
  </span>
);

// How the ticket's category/priority was decided.
export const SourceTag = ({ source }) =>
  source === 'ai' ? (
    <Tag tone="ai" icon="sparkles">AI</Tag>
  ) : source === 'admin' ? (
    <Tag icon="user">Manual</Tag>
  ) : (
    <Tag tone="warn">Rules</Tag>
  );
