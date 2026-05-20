import { Medal } from "lucide-react";
import type { WcaPersonalBest } from "../database";
import { formatRank, formatWcaResult } from "../profileStats";

export function WcaPersonalBestCard({
  personalBest,
}: {
  personalBest: WcaPersonalBest;
}) {
  return (
    <article className="wca-card">
      <div className="wca-card-head">
        <Medal size={18} />
        <strong>{personalBest.eventName}</strong>
      </div>
      <dl>
        <div>
          <dt>Single</dt>
          <dd>
            {formatWcaResult(personalBest.eventId, personalBest.bestSingle)}
          </dd>
        </div>
        <div>
          <dt>Average</dt>
          <dd>
            {formatWcaResult(personalBest.eventId, personalBest.bestAverage)}
          </dd>
        </div>
        <div>
          <dt>World rank</dt>
          <dd>
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
