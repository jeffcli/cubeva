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
    <article className="grid min-h-[118px] gap-2 rounded-lg bg-panel p-3 [&_svg]:text-accent [&_strong]:text-[clamp(1.35rem,2vw,2rem)]">
      {icon}
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}
