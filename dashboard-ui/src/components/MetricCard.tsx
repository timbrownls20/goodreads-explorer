import './MetricCard.css';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: string;
  icon?: string;
}

export const MetricCard = ({
  title,
  value,
  subtitle,
  trend,
  icon,
}: MetricCardProps) => {
  return (
    <div className="metric-card">
      {icon && <div className="metric-icon">{icon}</div>}
      <div className="metric-content">
        <h3 className="metric-title">{title}</h3>
        <div className="metric-value">{value}</div>
        {subtitle && <p className="metric-subtitle">{subtitle}</p>}
        {trend && <p className="metric-trend">{trend}</p>}
      </div>
    </div>
  );
};
