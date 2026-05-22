import type { WeeklyProgress } from "../features/profile/profileStats";

export function WeeklyProgressChart({
  onSelectDay,
  progress,
  selectedDayKey,
}: {
  onSelectDay: (dayKey: string) => void;
  progress: WeeklyProgress;
  selectedDayKey: string | null;
}) {
  const chartWidth = 560;
  const chartHeight = 205;
  const padding = { top: 22, right: 20, bottom: 32, left: 42 };
  const plotWidth = chartWidth - padding.left - padding.right;
  const plotHeight = chartHeight - padding.top - padding.bottom;
  const selectedDay =
    progress.days.find((day) => day.key === selectedDayKey) ??
    progress.days.at(-1) ??
    null;
  const maxValue = Math.max(...progress.days.map((day) => day.value), 1);
  const points = progress.days.map((day, index) => {
    const x =
      padding.left +
      (progress.days.length === 1
        ? plotWidth
        : (index / (progress.days.length - 1)) * plotWidth);
    const y = padding.top + plotHeight - (day.value / maxValue) * plotHeight;
    return { x, y, day };
  });
  const linePath = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");
  const areaPath = `${linePath} L ${padding.left + plotWidth} ${padding.top + plotHeight} L ${padding.left} ${padding.top + plotHeight} Z`;
  const selectedPoint =
    points.find((point) => point.day.key === selectedDay?.key) ?? points.at(-1);

  return (
    <article className="grid min-w-0 gap-3.5 rounded-lg border border-line bg-[#fffaf1] p-4">
      <div>
        <h4 className="m-0 text-[1.3rem]">This week</h4>
      </div>
      <div className="grid grid-cols-3 gap-2.5 max-[760px]:grid-cols-1 [&_div]:grid [&_div]:gap-1 [&_div]:border-r [&_div]:border-[#d8d1c5] max-[760px]:[&_div]:border-r-0 max-[760px]:[&_div]:border-b max-[760px]:[&_div]:pb-2.5 [&_div:last-child]:border-0 max-[760px]:[&_div:last-child]:pb-0 [&_span]:text-[0.84rem] [&_span]:font-extrabold [&_span]:text-muted [&_strong]:text-[clamp(1.4rem,3.4vw,2.25rem)] [&_strong]:font-extrabold [&_strong]:leading-none">
        <div>
          <span>Solves</span>
          <strong>{selectedDay?.value ?? 0}</strong>
        </div>
        <div>
          <span>Sessions</span>
          <strong>{selectedDay?.sessionCount ?? 0}</strong>
        </div>
        <div>
          <span>Events</span>
          <strong>{selectedDay?.eventCount ?? 0}</strong>
        </div>
      </div>
      <div className="min-w-0 overflow-hidden">
        <svg
          className="block h-auto w-full overflow-visible"
          role="img"
          aria-label={`Last 7 days: ${progress.totalSolves} solves`}
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        >
          <defs>
            <linearGradient id="weeklySolveFill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#f06d2f" stopOpacity="0.32" />
              <stop offset="100%" stopColor="#f06d2f" stopOpacity="0.04" />
            </linearGradient>
          </defs>
          {[0, 0.5, 1].map((ratio) => {
            const y = padding.top + plotHeight - ratio * plotHeight;
            return (
              <g key={ratio}>
                <line
                  className="stroke-[#ddd8d0] stroke-[1]"
                  x1={padding.left}
                  x2={padding.left + plotWidth}
                  y1={y}
                  y2={y}
                />
                <text className="fill-muted text-[13px]" x={8} y={y + 5}>
                  {Math.round(maxValue * ratio)}
                </text>
              </g>
            );
          })}
          {progress.days.map((day, index) => {
            const x =
              padding.left +
              (progress.days.length === 1
                ? plotWidth
                : (index / (progress.days.length - 1)) * plotWidth);
            return (
              <g key={day.label}>
                <line
                  className="stroke-[#ddd8d0] stroke-[1] opacity-[0.72]"
                  x1={x}
                  x2={x}
                  y1={padding.top}
                  y2={padding.top + plotHeight}
                />
                <text
                  className="fill-muted text-xs font-extrabold"
                  textAnchor="middle"
                  x={x}
                  y={chartHeight - 8}
                >
                  {day.label}
                </text>
              </g>
            );
          })}
          <path fill='url("#weeklySolveFill")' d={areaPath} />
          <path
            className="fill-none stroke-orange stroke-[5] [stroke-linecap:round] [stroke-linejoin:round]"
            d={linePath}
          />
          {points.map((point) => (
            <g
              className="group cursor-pointer outline-none"
              key={point.day.key}
              onClick={() => onSelectDay(point.day.key)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelectDay(point.day.key);
                }
              }}
              role="button"
              tabIndex={0}
            >
              <circle
                className={
                  point.day.key === selectedPoint?.day.key
                    ? "fill-orange stroke-orange stroke-[5]"
                    : "fill-[#fffaf1] stroke-orange stroke-[5]"
                }
                cx={point.x}
                cy={point.y}
                r="6"
              />
              <circle
                className="fill-orange opacity-0 group-hover:opacity-[0.12] group-focus:opacity-[0.12]"
                cx={point.x}
                cy={point.y}
                r="18"
              />
            </g>
          ))}
          {selectedPoint && (
            <>
              <line
                className="stroke-orange stroke-[4]"
                x1={selectedPoint.x}
                x2={selectedPoint.x}
                y1={padding.top}
                y2={padding.top + plotHeight}
              />
              <circle
                className="fill-orange opacity-[0.18]"
                cx={selectedPoint.x}
                cy={selectedPoint.y}
                r="20"
              />
              <circle
                className="fill-orange stroke-orange"
                cx={selectedPoint.x}
                cy={selectedPoint.y}
                r="10"
              />
              <text
                className="fill-orange text-[17px] font-black"
                textAnchor="end"
                x={selectedPoint.x}
                y={padding.top - 8}
              >
                {selectedPoint.day.value} solves
              </text>
            </>
          )}
        </svg>
      </div>
    </article>
  );
}
