import type { AppSession } from "../../data/database";
import { average, bestTime } from "../../utils/solveUtils";

export type EventStats = {
  puzzle: string;
  sessionCount: number;
  solveCount: number;
  best: string;
  average: string;
};

export type ChartBar = {
  key: string;
  label: string;
  eventCount?: number;
  sessionCount?: number;
  value: number;
};

export type WeeklyProgress = {
  days: ChartBar[];
  totalSolves: number;
  sessionCount: number;
  eventCount: number;
};

export function getEventStats(sessions: AppSession[]): EventStats[] {
  const events = new Map<string, AppSession[]>();

  for (const session of sessions) {
    events.set(session.puzzle, [
      ...(events.get(session.puzzle) ?? []),
      session,
    ]);
  }

  return [...events.entries()]
    .map(([puzzle, eventSessions]) => {
      const solves = eventSessions.flatMap((session) => session.solves);
      return {
        puzzle,
        sessionCount: eventSessions.length,
        solveCount: solves.length,
        best: solves.length ? bestTime(solves) : "--",
        average: solves.length ? average(solves) : "--",
      };
    })
    .sort(
      (a, b) => b.solveCount - a.solveCount || a.puzzle.localeCompare(b.puzzle),
    );
}

export function getWeeklyProgress(sessions: AppSession[]): WeeklyProgress {
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const dayKeys = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (6 - index));
    return date.toISOString().slice(0, 10);
  });
  const dayKeySet = new Set(dayKeys);
  const dayStats = new Map<
    string,
    { eventIds: Set<string>; sessionCount: number; solveCount: number }
  >();

  for (const session of sessions) {
    const date = new Date(session.createdAtSort ?? session.createdAt);
    if (Number.isNaN(date.getTime())) continue;

    const dayKey = date.toISOString().slice(0, 10);
    if (!dayKeySet.has(dayKey)) continue;

    const current = dayStats.get(dayKey) ?? {
      eventIds: new Set<string>(),
      sessionCount: 0,
      solveCount: 0,
    };
    current.eventIds.add(session.puzzle);
    current.sessionCount += 1;
    current.solveCount += session.solves.length;
    dayStats.set(dayKey, current);
  }

  const days = dayKeys.map((day) => ({
    key: day,
    label: formatChartDay(day),
    eventCount: dayStats.get(day)?.eventIds.size ?? 0,
    sessionCount: dayStats.get(day)?.sessionCount ?? 0,
    value: dayStats.get(day)?.solveCount ?? 0,
  }));

  return {
    days,
    eventCount: new Set(sessions.map((session) => session.puzzle)).size,
    sessionCount: sessions.length,
    totalSolves: days.reduce((sum, day) => sum + day.value, 0),
  };
}

export function formatWcaResult(eventId: string, value: number | null) {
  if (!value || value < 0) return "-";

  if (eventId === "333fm") {
    return `${stripTrailingZeros(value / 100)} moves`;
  }

  if (eventId === "333mbf") {
    return String(value);
  }

  const totalSeconds = value / 100;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes > 0) {
    return `${minutes}:${seconds.toFixed(2).padStart(5, "0")}`;
  }

  return seconds.toFixed(2);
}

export function formatRank(value: number | null) {
  return value ? `#${value.toLocaleString()}` : "-";
}

function formatChartDay(day: string) {
  const date = new Date(`${day}T12:00:00`);
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

function stripTrailingZeros(value: number) {
  return value.toFixed(2).replace(/\.?0+$/, "");
}
