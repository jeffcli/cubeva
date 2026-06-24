import { Swords, Trophy } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { wcaEvents } from "../cubing/scrambles";
import type {
  AppBattle,
  AppSession,
  BattleGoal,
  BattleStatus,
  SocialProfile,
} from "../data/database";
import { average, bestTime, effectiveTime } from "../utils/solveUtils";
import { Button } from "./ui/button";
import { Select } from "./ui/select";

export function BattlesPage({
  battles,
  loading,
  message,
  onCreateBattle,
  onUpdateStatus,
  people,
}: {
  battles: AppBattle[];
  loading: boolean;
  message: string;
  onCreateBattle: (input: {
    durationDays: number;
    eventLabel: string;
    goal: BattleGoal;
    opponentId: string;
  }) => void;
  onUpdateStatus: (battleId: string, status: BattleStatus) => void;
  people: SocialProfile[];
}) {
  const opponents = people;
  const [opponentId, setOpponentId] = useState(opponents[0]?.id ?? "");
  const [eventLabel, setEventLabel] = useState("3x3");
  const [goal, setGoal] = useState<BattleGoal>("best_single");
  const [durationDays, setDurationDays] = useState(7);

  useEffect(() => {
    if (opponents.length === 0) {
      setOpponentId("");
      return;
    }

    if (!opponents.some((person) => person.id === opponentId)) {
      setOpponentId(opponents[0].id);
    }
  }, [opponentId, opponents]);

  const canCreate = opponents.length > 0 && Boolean(opponentId);

  return (
    <section className="grid gap-4">
      <form
        className="grid gap-4 rounded-lg border border-line bg-card p-4 shadow-sm"
        onSubmit={(event) => {
          event.preventDefault();
          if (!canCreate) return;
          onCreateBattle({ durationDays, eventLabel, goal, opponentId });
        }}
      >
        <header>
          <p className="m-0 text-[0.72rem] font-medium uppercase text-muted">
            Head-to-head battles
          </p>
          <h2 className="m-0 text-[clamp(1.8rem,3vw,2.6rem)] leading-tight">
            Challenge a friend
          </h2>
        </header>
        <div className="grid gap-3 [grid-template-columns:repeat(4,minmax(0,1fr))] max-[980px]:grid-cols-2 max-[640px]:grid-cols-1">
          <label className="grid gap-1 text-xs font-medium text-muted">
            Opponent
            <Select
              value={opponentId}
              onChange={(event) => setOpponentId(event.target.value)}
            >
              {opponents.length === 0 ? (
                <option value="">No users available</option>
              ) : (
                opponents.map((person) => (
                  <option value={person.id} key={person.id}>
                    {person.name}
                  </option>
                ))
              )}
            </Select>
          </label>
          <label className="grid gap-1 text-xs font-medium text-muted">
            Event
            <Select
              value={eventLabel}
              onChange={(event) => setEventLabel(event.target.value)}
            >
              {wcaEvents.map((event) => (
                <option value={event.label} key={event.eventId}>
                  {event.label}
                </option>
              ))}
            </Select>
          </label>
          <label className="grid gap-1 text-xs font-medium text-muted">
            Goal
            <Select
              value={goal}
              onChange={(event) => setGoal(event.target.value as BattleGoal)}
            >
              <option value="best_single">Best single</option>
              <option value="average">Best average</option>
              <option value="most_solves">Most solves</option>
            </Select>
          </label>
          <label className="grid gap-1 text-xs font-medium text-muted">
            Duration
            <Select
              value={String(durationDays)}
              onChange={(event) => setDurationDays(Number(event.target.value))}
            >
              <option value="1">1 day</option>
              <option value="3">3 days</option>
              <option value="7">7 days</option>
            </Select>
          </label>
        </div>
        <Button className="justify-self-start" disabled={!canCreate || loading}>
          <Swords size={16} /> Create battle
        </Button>
        {message && (
          <p className="m-0 rounded-md bg-panel p-3 font-medium text-ink">
            {message}
          </p>
        )}
      </form>

      {loading && (
        <p className="m-0 rounded-md bg-panel p-3 font-medium text-ink">
          Loading battles.
        </p>
      )}
      {!loading && battles.length === 0 && (
        <p className="m-0 rounded-md bg-panel p-3 font-medium text-ink">
          No battles yet. Create one against another cuber.
        </p>
      )}
      {battles.map((battle) => (
        <BattleCard
          battle={battle}
          onUpdateStatus={onUpdateStatus}
          key={battle.id}
        />
      ))}
    </section>
  );
}

function BattleCard({
  battle,
  onUpdateStatus,
}: {
  battle: AppBattle;
  onUpdateStatus: (battleId: string, status: BattleStatus) => void;
}) {
  const scoreboard = useMemo(() => scoreBattle(battle), [battle]);
  const winner = scoreboard.find((entry) => entry.rank === 1);

  return (
    <article className="grid gap-4 rounded-lg border border-line bg-card p-4 shadow-sm">
      <header className="flex items-start justify-between gap-4 max-[760px]:flex-col">
        <div>
          <p className="m-0 text-[0.72rem] font-medium uppercase text-muted">
            {battle.eventLabel} · {goalLabel(battle.goal)}
          </p>
          <h3 className="m-0 flex items-center gap-2 text-[1.35rem]">
            <Swords size={20} /> {battle.creator.name} vs {battle.opponent.name}
          </h3>
          <small className="text-muted">
            {battle.startsAt} to {battle.endsAt}
          </small>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-md bg-panel px-2.5 py-1 text-sm font-medium capitalize">
            {battle.status}
          </span>
          {battle.status === "active" && (
            <Button
              size="sm"
              variant="secondary"
              type="button"
              onClick={() => onUpdateStatus(battle.id, "completed")}
            >
              Mark complete
            </Button>
          )}
          {battle.status !== "cancelled" && battle.status !== "completed" && (
            <Button
              size="sm"
              variant="destructive"
              type="button"
              onClick={() => onUpdateStatus(battle.id, "cancelled")}
            >
              Cancel
            </Button>
          )}
        </div>
      </header>

      <div className="grid gap-3 [grid-template-columns:repeat(2,minmax(0,1fr))] max-[760px]:grid-cols-1">
        {scoreboard.map((entry) => (
          <section
            className="grid gap-3 rounded-lg border border-line bg-panel p-3"
            key={entry.participant.id}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-md bg-teal text-xs font-semibold text-white">
                  {entry.participant.avatar}
                </span>
                <div>
                  <strong className="block">{entry.participant.name}</strong>
                  <small className="block text-muted">
                    {entry.participant.handle}
                  </small>
                </div>
              </div>
              {entry.rank === 1 && entry.score !== "--" && (
                <Trophy className="text-accent" size={20} />
              )}
            </div>
            <div>
              <strong className="block text-[2rem] leading-none">
                {entry.score}
              </strong>
              <small className="mt-1 block text-muted">
                {entry.solveCount} solves during battle
              </small>
            </div>
          </section>
        ))}
      </div>

      {winner && winner.score !== "--" && (
        <p className="m-0 rounded-md bg-panel p-3 font-medium text-ink">
          Current leader: {winner.participant.name}
        </p>
      )}
    </article>
  );
}

function scoreBattle(battle: AppBattle) {
  const entries = [battle.creator, battle.opponent].map((participant) => {
    const solves = participant.sessions
      .filter(
        (session) =>
          session.puzzle === battle.eventLabel &&
          isInBattleWindow(session, battle),
      )
      .flatMap((session) => session.solves);
    const validSolves = solves.filter((solve) =>
      Number.isFinite(effectiveTime(solve)),
    );

    const scoreValue =
      battle.goal === "most_solves"
        ? solves.length
        : battle.goal === "best_single" && validSolves.length
          ? Math.min(...validSolves.map(effectiveTime))
          : battle.goal === "average" && validSolves.length
            ? validSolves.reduce(
                (sum, solve) => sum + effectiveTime(solve),
                0,
              ) / validSolves.length
            : Number.POSITIVE_INFINITY;
    const score =
      battle.goal === "most_solves"
        ? String(solves.length)
        : battle.goal === "best_single" && validSolves.length
          ? bestTime(validSolves)
          : battle.goal === "average" && validSolves.length
            ? average(validSolves)
            : "--";

    return {
      participant,
      score,
      scoreValue,
      solveCount: solves.length,
      rank: 0,
    };
  });

  entries.sort((a, b) =>
    battle.goal === "most_solves"
      ? b.scoreValue - a.scoreValue
      : a.scoreValue - b.scoreValue,
  );

  return entries.map((entry, index) => ({ ...entry, rank: index + 1 }));
}

function isInBattleWindow(session: AppSession, battle: AppBattle) {
  const sessionTime = Date.parse(session.createdAtSort ?? session.createdAt);
  return (
    sessionTime >= Date.parse(battle.createdAtSort) &&
    sessionTime <= Date.parse(battle.endsAtSort)
  );
}

function goalLabel(goal: BattleGoal) {
  if (goal === "best_single") return "Best single";
  if (goal === "average") return "Best average";
  return "Most solves";
}
