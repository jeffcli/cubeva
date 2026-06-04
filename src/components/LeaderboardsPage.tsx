import { Medal, Trophy } from "lucide-react";
import { useMemo, useState } from "react";
import { wcaEvents } from "../cubing/scrambles";
import type {
  AppSession,
  LeaderboardEntry,
  LeaderboardMetric,
  SocialProfile,
} from "../data/database";
import { average, bestTime, effectiveTime } from "../utils/solveUtils";
import { Select } from "./ui/select";

export function LeaderboardsPage({
  following,
  self,
}: {
  following: SocialProfile[];
  self: {
    id: string;
    name: string;
    handle: string;
    avatar: string;
    sessions: AppSession[];
  };
}) {
  const [eventLabel, setEventLabel] = useState("all");
  const [metric, setMetric] = useState<LeaderboardMetric>("average");
  const entries = useMemo(
    () => buildLeaderboardEntries({ eventLabel, following, metric, self }),
    [eventLabel, following, metric, self],
  );

  return (
    <section className="grid gap-4 rounded-lg border border-line bg-card p-4 shadow-sm">
      <header className="flex items-start justify-between gap-4 max-[760px]:flex-col">
        <div>
          <p className="m-0 text-[0.72rem] font-medium uppercase text-muted">
            Friend leaderboards
          </p>
          <h2 className="m-0 text-[clamp(1.8rem,3vw,2.6rem)] leading-tight">
            Compare your training pack
          </h2>
        </div>
        <div className="grid min-w-[280px] grid-cols-2 gap-2 max-[760px]:w-full">
          <label className="grid gap-1 text-xs font-medium text-muted">
            Event
            <Select
              value={eventLabel}
              onChange={(event) => setEventLabel(event.target.value)}
            >
              <option value="all">All events</option>
              {wcaEvents.map((event) => (
                <option value={event.label} key={event.eventId}>
                  {event.label}
                </option>
              ))}
            </Select>
          </label>
          <label className="grid gap-1 text-xs font-medium text-muted">
            Metric
            <Select
              value={metric}
              onChange={(event) =>
                setMetric(event.target.value as LeaderboardMetric)
              }
            >
              <option value="average">Average</option>
              <option value="best">Best single</option>
              <option value="solves">Solves</option>
              <option value="sessions">Sessions</option>
            </Select>
          </label>
        </div>
      </header>

      {entries.length === 0 ? (
        <p className="m-0 rounded-md bg-panel p-3 font-medium text-ink">
          Follow cubers with public sessions to populate this leaderboard.
        </p>
      ) : (
        <div className="grid gap-2">
          {entries.map((entry) => (
            <article
              className="grid items-center gap-3 rounded-lg border border-line bg-card p-3 shadow-sm [grid-template-columns:44px_minmax(0,1fr)_auto] max-[760px]:[grid-template-columns:40px_minmax(0,1fr)]"
              key={entry.profileId}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-panel font-semibold text-ink">
                {entry.rank === 1 ? <Trophy size={18} /> : entry.rank}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-md bg-teal text-xs font-semibold text-white">
                    {entry.avatar}
                  </span>
                  <div className="min-w-0">
                    <strong className="block truncate">{entry.name}</strong>
                    <small className="block text-muted">{entry.handle}</small>
                  </div>
                </div>
              </div>
              <div className="text-right max-[760px]:col-span-full max-[760px]:text-left">
                <strong className="block text-[1.35rem] leading-none">
                  {entry.score}
                </strong>
                <small className="mt-1 inline-flex items-center gap-1 text-muted">
                  <Medal size={14} /> {entry.solveCount} solves ·{" "}
                  {entry.sessionCount} sessions
                </small>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function buildLeaderboardEntries({
  eventLabel,
  following,
  metric,
  self,
}: {
  eventLabel: string;
  following: SocialProfile[];
  metric: LeaderboardMetric;
  self: {
    id: string;
    name: string;
    handle: string;
    avatar: string;
    sessions: AppSession[];
  };
}) {
  const competitors = [
    { ...self, following: true },
    ...following
      .filter((person) => person.following)
      .map((person) => ({
        id: person.id,
        name: person.name,
        handle: person.handle,
        avatar: person.avatar,
        following: person.following,
        sessions: person.sessions,
      })),
  ];

  const entries = competitors
    .map((competitor) =>
      makeLeaderboardEntry({
        competitor,
        eventLabel,
        metric,
      }),
    )
    .filter((entry): entry is LeaderboardEntry => Boolean(entry))
    .sort((a, b) =>
      metric === "sessions" || metric === "solves"
        ? b.scoreValue - a.scoreValue
        : a.scoreValue - b.scoreValue,
    );

  return entries.map((entry, index) => ({ ...entry, rank: index + 1 }));
}

function makeLeaderboardEntry({
  competitor,
  eventLabel,
  metric,
}: {
  competitor: {
    id: string;
    name: string;
    handle: string;
    avatar: string;
    following: boolean;
    sessions: AppSession[];
  };
  eventLabel: string;
  metric: LeaderboardMetric;
}) {
  const sessions =
    eventLabel === "all"
      ? competitor.sessions
      : competitor.sessions.filter((session) => session.puzzle === eventLabel);
  const solves = sessions.flatMap((session) => session.solves);
  const validSolves = solves.filter((solve) => Number.isFinite(effectiveTime(solve)));

  if (metric === "sessions" && sessions.length === 0) return null;
  if (metric === "solves" && solves.length === 0) return null;
  if ((metric === "average" || metric === "best") && validSolves.length === 0) {
    return null;
  }

  const scoreValue =
    metric === "sessions"
      ? sessions.length
      : metric === "solves"
        ? solves.length
        : metric === "best"
          ? Math.min(...validSolves.map(effectiveTime))
          : validSolves.reduce((sum, solve) => sum + effectiveTime(solve), 0) /
            validSolves.length;

  const score =
    metric === "sessions"
      ? `${sessions.length}`
      : metric === "solves"
        ? `${solves.length}`
        : metric === "best"
          ? bestTime(validSolves)
          : average(validSolves);

  return {
    profileId: competitor.id,
    name: competitor.name,
    handle: competitor.handle,
    avatar: competitor.avatar,
    following: competitor.following,
    rank: 0,
    eventLabel,
    metric,
    score,
    scoreValue,
    sessionCount: sessions.length,
    solveCount: solves.length,
    best: validSolves.length ? bestTime(validSolves) : "--",
    average: validSolves.length ? average(validSolves) : "--",
  };
}
