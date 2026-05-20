import type { AppSession, AppSolve, SocialProfile } from "./database";
import { formatSessionTimestamp } from "./dateUtils";
import { makeSolve } from "./solveUtils";

const now = Date.now();
const lunchSessionCreatedAt = new Date(now - 1000 * 60 * 45).toISOString();
const ohSessionCreatedAt = new Date(now - 1000 * 60 * 60 * 27).toISOString();

export const starterSessions: AppSession[] = [
  {
    id: "s1",
    user: "Maya Chen",
    avatar: "MC",
    puzzle: "3x3",
    title: "Lunch break turning felt clean",
    createdAt: formatSessionTimestamp(lunchSessionCreatedAt),
    createdAtSort: lunchSessionCreatedAt,
    liked: true,
    solves: [
      makeSolve(18740, "ok"),
      makeSolve(17990, "ok"),
      makeSolve(19630, "+2"),
      makeSolve(17320, "ok"),
      makeSolve(18110, "ok"),
    ],
  },
  {
    id: "s2",
    user: "Noah Patel",
    avatar: "NP",
    puzzle: "3x3 OH",
    title: "One-handed consistency block",
    createdAt: formatSessionTimestamp(ohSessionCreatedAt),
    createdAtSort: ohSessionCreatedAt,
    liked: false,
    solves: [
      makeSolve(31240, "ok"),
      makeSolve(29870, "ok"),
      makeSolve(33610, "ok"),
      makeSolve(30550, "ok"),
      makeSolve(32190, "dnf"),
    ],
  },
];

export const initialSolves: AppSolve[] = [
  makeSolve(21420, "ok"),
  makeSolve(20350, "ok"),
  makeSolve(22810, "+2"),
  makeSolve(19770, "ok"),
];

export const candidates: SocialProfile[] = [
  {
    id: "u1",
    name: "Lena Ortiz",
    handle: "@lena2look",
    avatar: "LO",
    average: "avg 16.84",
    following: false,
    bio: "Color-neutral 3x3 solver working on smoother F2L and calmer last layers.",
    wcaId: "",
    sessions: [
      makeCandidateSession("Lena Ortiz", "LO", "3x3", "Evening lookahead block", [16840, 17220, 16190, 17980, 16550]),
      makeCandidateSession("Lena Ortiz", "LO", "2x2", "Quick layer drills", [5290, 4810, 5120, 4960, 5030]),
    ],
  },
  {
    id: "u2",
    name: "Sam Rivera",
    handle: "@samcuber",
    avatar: "SR",
    average: "avg 21.03",
    following: true,
    bio: "Casual cuber chasing sub-20 while keeping solves fun.",
    wcaId: "",
    sessions: [
      makeCandidateSession("Sam Rivera", "SR", "3x3", "Sub-20 attempt set", [21030, 19840, 22450, 20580, 21710]),
      makeCandidateSession("Sam Rivera", "SR", "Pyraminx", "Tips-only practice", [8120, 7790, 8400, 7950, 7680]),
    ],
  },
  {
    id: "u3",
    name: "Iris Zhou",
    handle: "@iriscross",
    avatar: "IZ",
    average: "avg 13.92",
    following: false,
    bio: "Cross planning nerd. Mostly 3x3, sometimes OH when the wrists cooperate.",
    wcaId: "",
    sessions: [
      makeCandidateSession("Iris Zhou", "IZ", "3x3", "Fast cross planning", [13920, 14410, 13680, 14190, 13220]),
      makeCandidateSession("Iris Zhou", "IZ", "3x3 OH", "Controlled TPS set", [27910, 28640, 27120, 29500, 28220]),
    ],
  },
];

function makeCandidateSession(
  user: string,
  avatar: string,
  puzzle: string,
  title: string,
  times: number[],
): AppSession {
  const createdAt = new Date(now - 1000 * 60 * 60 * 12).toISOString();

  return {
    id: crypto.randomUUID(),
    user,
    avatar,
    puzzle,
    title,
    createdAt: formatSessionTimestamp(createdAt),
    createdAtSort: createdAt,
    liked: false,
    solves: times.map((time) => makeSolve(time, "ok")),
  };
}
