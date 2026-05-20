import { Activity, Clock, Flame, Trophy } from "lucide-react";
import type { EventStats } from "../profileStats";
import { Metric } from "./Metric";

export function EventStatRow({ event }: { event: EventStats }) {
  return (
    <article className="event-stat-row">
      <div>
        <strong>{event.puzzle}</strong>
        <small>
          {event.sessionCount} sessions · {event.solveCount} solves
        </small>
      </div>
      <div className="event-stat-values">
        <span>best {event.best}</span>
        <span>avg {event.average}</span>
      </div>
    </article>
  );
}

export function EventStatDetail({ event }: { event: EventStats }) {
  return (
    <article className="event-stat-detail">
      <div className="section-head">
        <h4>{event.puzzle}</h4>
        <span>{event.solveCount} solves</span>
      </div>
      <div className="event-detail-grid">
        <Metric icon={<Trophy size={18} />} label="Best" value={event.best} />
        <Metric
          icon={<Activity size={18} />}
          label="Average"
          value={event.average}
        />
        <Metric
          icon={<Clock size={18} />}
          label="Sessions"
          value={String(event.sessionCount)}
        />
        <Metric
          icon={<Flame size={18} />}
          label="Solves"
          value={String(event.solveCount)}
        />
      </div>
    </article>
  );
}
