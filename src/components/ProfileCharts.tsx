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
  const chartWidth = 640;
  const chartHeight = 260;
  const padding = { top: 30, right: 26, bottom: 42, left: 42 };
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
  const selectedLabelX = selectedPoint
    ? Math.min(
        Math.max(selectedPoint.x, padding.left + 58),
        chartWidth - padding.right - 58,
      )
    : 0;
  const selectedLabelAnchor =
    selectedPoint && selectedPoint.x < padding.left + 72
      ? "start"
      : selectedPoint && selectedPoint.x > chartWidth - padding.right - 72
        ? "end"
        : "middle";

  return (
    <article className="grid min-w-0 gap-4 rounded-lg border border-line bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3 max-[760px]:flex-col">
        <div>
          <p className="m-0 text-[0.72rem] font-medium uppercase text-muted">
            Last 7 days
          </p>
          <h4 className="m-0 text-[1.25rem] leading-tight">Progress</h4>
        </div>
        <div className="rounded-md border border-line bg-panel px-2.5 py-1 text-sm font-medium text-muted">
          {progress.totalSolves} total solves
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 max-[760px]:grid-cols-1">
        <div className="grid gap-1 rounded-md border border-line bg-card p-3">
          <span className="text-sm font-medium text-muted">Solves</span>
          <strong className="text-[1.75rem] font-semibold leading-none">
            {selectedDay?.value ?? 0}
          </strong>
        </div>
        <div className="grid gap-1 rounded-md border border-line bg-card p-3">
          <span className="text-sm font-medium text-muted">Sessions</span>
          <strong className="text-[1.75rem] font-semibold leading-none">
            {selectedDay?.sessionCount ?? 0}
          </strong>
        </div>
        <div className="grid gap-1 rounded-md border border-line bg-card p-3">
          <span className="text-sm font-medium text-muted">Events</span>
          <strong className="text-[1.75rem] font-semibold leading-none">
            {selectedDay?.eventCount ?? 0}
          </strong>
        </div>
      </div>
      <div className="min-w-0 overflow-hidden rounded-md border border-line bg-panel/40 px-2 pb-1 pt-2">
        <svg
          className="block h-auto w-full overflow-visible"
          role="img"
          aria-label={`Last 7 days: ${progress.totalSolves} solves`}
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        >
          <defs>
            <linearGradient id="weeklySolveFill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#0f766e" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#0f766e" stopOpacity="0.02" />
            </linearGradient>
          </defs>
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const y = padding.top + plotHeight - ratio * plotHeight;
            return (
              <g key={ratio}>
                <line
                  className="stroke-line stroke-[1] opacity-70"
                  x1={padding.left}
                  x2={padding.left + plotWidth}
                  y1={y}
                  y2={y}
                />
                <text className="fill-muted text-[12px]" x={8} y={y + 4}>
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
                  className="stroke-line stroke-[1] opacity-40"
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
            className="fill-none stroke-teal stroke-[3] [stroke-linecap:round] [stroke-linejoin:round]"
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
                    ? "fill-teal stroke-card stroke-[3]"
                    : "fill-card stroke-teal stroke-[3]"
                }
                cx={point.x}
                cy={point.y}
                r={point.day.key === selectedPoint?.day.key ? "7" : "5"}
              />
              <circle
                className="fill-teal opacity-0 transition-opacity group-hover:opacity-[0.12] group-focus:opacity-[0.12]"
                cx={point.x}
                cy={point.y}
                r="16"
              />
            </g>
          ))}
          {selectedPoint && (
            <>
              <line
                className="stroke-teal stroke-[2] opacity-80"
                x1={selectedPoint.x}
                x2={selectedPoint.x}
                y1={padding.top}
                y2={padding.top + plotHeight}
              />
              <circle
                className="fill-teal opacity-[0.14]"
                cx={selectedPoint.x}
                cy={selectedPoint.y}
                r="18"
              />
              <circle
                className="fill-teal stroke-card stroke-[3]"
                cx={selectedPoint.x}
                cy={selectedPoint.y}
                r="8"
              />
              <text
                className="fill-teal text-[14px] font-semibold"
                textAnchor={selectedLabelAnchor}
                x={selectedLabelX}
                y={padding.top - 10}
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
