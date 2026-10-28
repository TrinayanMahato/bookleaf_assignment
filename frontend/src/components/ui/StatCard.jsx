import Icon from './Icon';

export default function StatCard({ icon, label, value, hint, tone = 'neutral', alert = false }) {
  return (
    <div className={`stat tone-${tone} ${alert ? 'stat-alert' : ''}`}>
      <span className="stat-icon"><Icon name={icon} size={19} /></span>
      <div>
        <div className="stat-label">{label}</div>
        <div className="stat-value">{value}</div>
        {hint && <div className="stat-hint">{hint}</div>}
      </div>
    </div>
  );
}
