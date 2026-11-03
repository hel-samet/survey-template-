import Icon from '../common/Icon.jsx';

// tone: teal | blue | amber | violet
export default function StatCard({ label, value, icon, tone = 'teal' }) {
  return (
    <div className={`card stat-card stat-card--${tone}`}>
      {icon && (
        <span className="stat-card__icon">
          <Icon name={icon} size={20} />
        </span>
      )}
      <span className="stat-card__value">{value}</span>
      <span className="stat-card__label">{label}</span>
    </div>
  );
}
