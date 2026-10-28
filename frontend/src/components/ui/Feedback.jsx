import Icon from './Icon';

const BANNER_ICONS = { error: 'alert', info: 'info', success: 'checkCircle', warn: 'alert', ai: 'sparkles' };

export const Spinner = ({ label = 'Loading…' }) => (
  <div className="spinner-row" role="status">
    <span className="spinner" aria-hidden="true" />
    <span>{label}</span>
  </div>
);

export const Notice = ({ children, tone = 'info', action }) => (
  <div className={`banner banner-${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
    <Icon name={BANNER_ICONS[tone]} size={17} />
    <div className="banner-body">{children}</div>
    {action}
  </div>
);

export const ErrorBanner = ({ error, onRetry }) =>
  error ? (
    <Notice
      tone="error"
      action={
        onRetry && (
          <button type="button" className="btn btn-small" onClick={() => onRetry()}>
            <Icon name="refresh" size={14} /> Try again
          </button>
        )
      }
    >
      {error.message || String(error)}
    </Notice>
  ) : null;

export const EmptyState = ({ icon = 'inbox', title, children, action }) => (
  <div className="empty-state">
    <div className="empty-icon"><Icon name={icon} size={22} /></div>
    <h3>{title}</h3>
    {children && <p>{children}</p>}
    {action}
  </div>
);

// Shows whether the real-time (SSE) connection is up.
export const LiveIndicator = ({ live }) => (
  <span className={`live ${live ? '' : 'off'}`} title={live ? 'Receiving updates in real time' : 'Reconnecting…'}>
    <span className="live-dot" aria-hidden="true" />
    {live ? 'Live' : 'Connecting'}
  </span>
);

export const Toast = ({ title, children, onClose }) => (
  <div className="toast" role="status">
    <span className="toast-icon"><Icon name="bell" size={16} /></span>
    <div className="toast-body">
      <strong>{title}</strong>
      {children && <span>{children}</span>}
    </div>
    <button type="button" className="toast-close" onClick={onClose} aria-label="Dismiss">
      <Icon name="x" size={15} />
    </button>
  </div>
);
