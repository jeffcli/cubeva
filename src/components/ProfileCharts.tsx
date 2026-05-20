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
  const chartWidth = 600;
  const chartHeight = 180;
  const padding = { top: 20, right: 20, bottom: 30, left: 42 };
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
    <article className="weekly-progress-card">
      <div>
        <h4>This week</h4>
      </div>
      <div className="weekly-summary">
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
      <div className="weekly-chart-wrap">
        <svg
          className="weekly-chart"
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
                  className="weekly-grid-line"
                  x1={padding.left}
                  x2={padding.left + plotWidth}
                  y1={y}
                  y2={y}
                />
                <text className="weekly-axis-label" x={8} y={y + 5}>
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
                  className="weekly-grid-line vertical"
                  x1={x}
                  x2={x}
                  y1={padding.top}
                  y2={padding.top + plotHeight}
                />
                <text
                  className="weekly-axis-label day"
                  textAnchor="middle"
                  x={x}
                  y={chartHeight - 8}
                >
                  {day.label}
                </text>
              </g>
            );
          })}
          <path className="weekly-area" d={areaPath} />
          <path className="weekly-line" d={linePath} />
          {points.map((point) => (
            <g
              className="weekly-point-button"
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
                    ? "weekly-point selected"
                    : "weekly-point"
                }
                cx={point.x}
                cy={point.y}
                r="6"
              />
              <circle
                className="weekly-hit-target"
                cx={point.x}
                cy={point.y}
                r="18"
              />
            </g>
          ))}
          {selectedPoint && (
            <>
              <line
                className="weekly-current-line"
                x1={selectedPoint.x}
                x2={selectedPoint.x}
                y1={padding.top}
                y2={padding.top + plotHeight}
              />
              <circle
                className="weekly-current-glow"
                cx={selectedPoint.x}
                cy={selectedPoint.y}
                r="20"
              />
              <circle
                className="weekly-current-point"
                cx={selectedPoint.x}
                cy={selectedPoint.y}
                r="10"
              />
              <text
                className="weekly-current-label"
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
