export const Spinner = ({ label = 'Loading…' }) => (
  <div className="spinner-row" role="status">
    <span className="spinner" aria-hidden="true" />
    <span>{label}</span>
  </div>
);

export const ErrorBanner = ({ error, onRetry }) =>
  error ? (
    <div className="banner banner-error" role="alert">
      <span>{error.message || String(error)}</span>
      {onRetry && (
        <button type="button" className="btn btn-small" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  ) : null;

export const Notice = ({ children, tone = 'info' }) => <div className={`banner banner-${tone}`}>{children}</div>;

export const EmptyState = ({ title, children, action }) => (
  <div className="empty-state">
    <h3>{title}</h3>
    {children && <p>{children}</p>}
    {action}
  </div>
);
