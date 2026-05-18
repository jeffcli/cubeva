export function Metric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <article className="metric">
      {icon}
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}
