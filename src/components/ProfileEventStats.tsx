import { Activity, Clock, Flame, Trophy } from "lucide-react";
import type { EventStats } from "../features/profile/profileStats";
import { Metric } from "./Metric";

export function EventStatRow({ event }: { event: EventStats }) {
  return (
    <article className="flex items-center justify-between gap-3 rounded-lg border border-panel-border bg-panel p-3.5 max-[760px]:flex-col max-[760px]:items-stretch">
      <div>
        <strong>{event.puzzle}</strong>
        <small className="mt-1 block text-soft-muted">
          {event.sessionCount} sessions · {event.solveCount} solves
        </small>
      </div>
      <div className="flex flex-wrap justify-end gap-2 max-[760px]:justify-stretch [&_span]:rounded-lg [&_span]:border [&_span]:border-panel-border [&_span]:bg-white [&_span]:px-2.5 [&_span]:py-2 [&_span]:font-black max-[760px]:[&_span]:flex-1 max-[760px]:[&_span]:text-center">
        <span>best {event.best}</span>
        <span>avg {event.average}</span>
      </div>
    </article>
  );
}

export function EventStatDetail({ event }: { event: EventStats }) {
  return (
    <article className="grid gap-3 rounded-lg border border-panel-border bg-panel p-3.5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h4 className="m-0 text-[1.1rem]">{event.puzzle}</h4>
        <span className="text-[0.85rem] font-extrabold text-soft-muted">
          {event.solveCount} solves
        </span>
      </div>
      <div className="grid grid-cols-4 gap-2.5 max-[760px]:grid-cols-2">
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
