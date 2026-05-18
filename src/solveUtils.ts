import type { AppSession, AppSolve, Penalty } from "./database";

export const sampleScrambles = [
  "R U R' U' F2 D L2 U R2 F' U2",
  "F R U' R' U' R U R' F' L2 D2",
  "L2 B2 U' R2 F2 D B2 L' U R'",
  "R2 U2 F' L2 B D2 R U' B2 D",
  "U F2 R U' R2 F L' D2 B U2",
];

export function makeSolve(
  timeMs: number,
  penalty: Penalty,
  scramble = sampleScrambles[Math.floor(Math.random() * sampleScrambles.length)],
  resultType: "time" | "moves" = "time",
): AppSolve {
  return {
    id: crypto.randomUUID(),
    timeMs,
    penalty,
    scramble,
    createdAt: new Date().toISOString(),
    resultType,
  };
}

export function formatTime(ms: number, penalty: Penalty = "ok") {
  if (penalty === "dnf") return "DNF";
  const adjusted = penalty === "+2" ? ms + 2000 : ms;
  const seconds = adjusted / 1000;
  return seconds < 60
    ? seconds.toFixed(2)
    : `${Math.floor(seconds / 60)}:${(seconds % 60).toFixed(2).padStart(5, "0")}`;
}

export function effectiveTime(solve: AppSolve) {
  if (solve.penalty === "dnf") return Number.POSITIVE_INFINITY;
  return solve.timeMs + (solve.penalty === "+2" && solve.resultType !== "moves" ? 2000 : 0);
}

export function average(solves: AppSolve[]) {
  const valid = solves.filter((solve) => solve.penalty !== "dnf");
  if (!valid.length) return "DNF";
  const value = valid.reduce((sum, solve) => sum + effectiveTime(solve), 0) / valid.length;
  return valid.every((solve) => solve.resultType === "moves")
    ? formatMoves(value)
    : formatTime(value);
}

export function bestTime(solves: AppSolve[]) {
  const validTimes = solves
    .map(effectiveTime)
    .filter((time) => Number.isFinite(time));

  if (!validTimes.length) return "DNF";
  return solves.some((solve) => solve.resultType === "moves")
    ? formatMoves(Math.min(...validTimes))
    : formatTime(Math.min(...validTimes));
}

export function averageOf(solves: AppSolve[], size: number) {
  if (solves.length < size) return "--";
  if (solves.some((solve) => solve.resultType === "moves")) return "--";
  const window = solves
    .slice(0, size)
    .map(effectiveTime)
    .sort((a, b) => a - b);
  const trimmed = window.slice(1, -1);

  if (trimmed.some((time) => !Number.isFinite(time))) return "DNF";
  return formatTime(
    trimmed.reduce((sum, time) => sum + time, 0) / trimmed.length,
  );
}

export function formatMoves(value: number) {
  return `${Number.isInteger(value) ? value : value.toFixed(1)} moves`;
}

export function formatSolveResult(solve: AppSolve) {
  return solve.resultType === "moves"
    ? formatMoves(solve.timeMs)
    : formatTime(solve.timeMs, solve.penalty);
}

export function parseImportedSolves(
  value: string,
  scramble: string,
  resultType: "time" | "moves",
) {
  return value
    .split(/[\n,;]+/)
    .map((raw) => raw.trim())
    .filter(Boolean)
    .map((raw) => {
      const lowered = raw.toLowerCase();
      const penalty: Penalty = lowered.includes("dnf")
        ? "dnf"
        : lowered.includes("+2")
          ? "+2"
          : "ok";
      const cleaned = lowered.replace("dnf", "").replace("+2", "").trim();
      const parsed = resultType === "moves" ? parseMoves(cleaned) : parseTimeToMs(cleaned);

      if (!parsed) return null;
      return makeSolve(parsed, penalty, scramble, resultType);
    })
    .filter((solve): solve is AppSolve => Boolean(solve));
}

export function parseMoves(value: string) {
  const parsed = Number.parseInt(value.replace(/moves?/gi, "").trim(), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function parseTimeToMs(value: string) {
  const parts = value.split(":").map(Number);
  if (parts.some((part) => !Number.isFinite(part) || part < 0)) return null;

  if (parts.length === 1) return Math.round(parts[0] * 1000);
  if (parts.length === 2) return Math.round((parts[0] * 60 + parts[1]) * 1000);
  return null;
}

export function getProfileStats(sessions: AppSession[]) {
  const allSolves = sessions.flatMap((session) => session.solves);
  const events = new Set(sessions.map((session) => session.puzzle));

  return {
    sessionCount: sessions.length,
    solveCount: allSolves.length,
    best: allSolves.length ? bestTime(allSolves) : "--",
    average: allSolves.length ? average(allSolves) : "--",
    eventCount: events.size,
  };
}
