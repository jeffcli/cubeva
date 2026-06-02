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
    <article className="grid min-h-[118px] gap-2 rounded-lg border border-line bg-card p-3 shadow-sm [&_svg]:text-muted [&_span]:text-sm [&_span]:font-medium [&_span]:text-muted [&_strong]:text-[clamp(1.35rem,2vw,2rem)] [&_strong]:font-semibold">
      {icon}
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}
