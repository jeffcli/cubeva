import { Medal } from "lucide-react";
import type { WcaPersonalBest } from "../data/database";
import { formatRank, formatWcaResult } from "../features/profile/profileStats";

export function WcaPersonalBestCard({
  personalBest,
}: {
  personalBest: WcaPersonalBest;
}) {
  return (
    <article className="grid gap-2.5 rounded-lg border border-panel-border bg-panel p-3.5">
      <div className="flex items-center gap-2">
        <Medal size={18} />
        <strong>{personalBest.eventName}</strong>
      </div>
      <dl className="m-0 grid gap-2">
        <div className="flex items-center justify-between gap-2.5">
          <dt className="text-[0.75rem] font-black uppercase text-muted">
            Single
          </dt>
          <dd className="m-0 text-right font-black">
            {formatWcaResult(personalBest.eventId, personalBest.bestSingle)}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-2.5">
          <dt className="text-[0.75rem] font-black uppercase text-muted">
            Average
          </dt>
          <dd className="m-0 text-right font-black">
            {formatWcaResult(personalBest.eventId, personalBest.bestAverage)}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-2.5">
          <dt className="text-[0.75rem] font-black uppercase text-muted">
            World rank
          </dt>
          <dd className="m-0 text-right font-black">
            {formatRank(personalBest.worldRankSingle)}
            {personalBest.worldRankAverage
              ? ` / ${formatRank(personalBest.worldRankAverage)}`
              : ""}
          </dd>
        </div>
      </dl>
    </article>
  );
}
