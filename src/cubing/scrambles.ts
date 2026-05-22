export const wcaEvents = [
  { label: "3x3", eventId: "333", inspection: true, manualOnly: false },
  { label: "2x2", eventId: "222", inspection: true, manualOnly: false },
  { label: "4x4", eventId: "444", inspection: true, manualOnly: false },
  { label: "5x5", eventId: "555", inspection: true, manualOnly: false },
  { label: "6x6", eventId: "666", inspection: true, manualOnly: false },
  { label: "7x7", eventId: "777", inspection: true, manualOnly: false },
  { label: "3x3 OH", eventId: "333oh", inspection: true, manualOnly: false },
  { label: "3x3 FMC", eventId: "333fm", inspection: false, manualOnly: true },
  { label: "3x3 BLD", eventId: "333bf", inspection: false, manualOnly: false },
  { label: "4x4 BLD", eventId: "444bf", inspection: false, manualOnly: false },
  { label: "5x5 BLD", eventId: "555bf", inspection: false, manualOnly: false },
  { label: "3x3 MBLD", eventId: "333mbf", inspection: false, manualOnly: false },
  { label: "Clock", eventId: "clock", inspection: true, manualOnly: false },
  { label: "Megaminx", eventId: "minx", inspection: true, manualOnly: false },
  { label: "Pyraminx", eventId: "pyram", inspection: true, manualOnly: false },
  { label: "Skewb", eventId: "skewb", inspection: true, manualOnly: false },
  { label: "Square-1", eventId: "sq1", inspection: true, manualOnly: false },
] as const;

export function eventConfig(label: string) {
  return wcaEvents.find((event) => event.label === label) ?? wcaEvents[0];
}

export function puzzleIdForEvent(label: string) {
  const eventId = eventIds[label] ?? "333";
  const puzzleIds: Record<string, string> = {
    "222": "2x2x2",
    "333": "3x3x3",
    "333bf": "3x3x3",
    "333fm": "3x3x3",
    "333mbf": "3x3x3",
    "333oh": "3x3x3",
    "444": "4x4x4",
    "444bf": "4x4x4",
    "555": "5x5x5",
    "555bf": "5x5x5",
    "666": "6x6x6",
    "777": "7x7x7",
    clock: "clock",
    minx: "megaminx",
    pyram: "pyraminx",
    skewb: "skewb",
    sq1: "square1",
  };

  return puzzleIds[eventId] ?? "3x3x3";
}

const eventIds = Object.fromEntries(
  wcaEvents.map((event) => [event.label, event.eventId]),
);

const fallbackFaces = ["R", "L", "U", "D", "F", "B"];
const suffixes = ["", "'", "2"];

export async function generateScramble(puzzle: string) {
  const eventId = eventIds[puzzle] ?? "333";

  try {
    const { randomScrambleForEvent } = await import("cubing/scramble");
    return (await randomScrambleForEvent(eventId)).toString();
  } catch {
    return fallbackScramble(puzzle);
  }
}

function fallbackScramble(puzzle: string) {
  const lengthByEvent: Record<string, number> = {
    "2x2": 11,
    "4x4": 40,
    "5x5": 60,
    "6x6": 80,
    "7x7": 100,
    Megaminx: 70,
    "4x4 BLD": 40,
    "5x5 BLD": 60,
  };
  const length = lengthByEvent[puzzle] ?? 20;
  const moves: string[] = [];
  let previous = "";

  while (moves.length < length) {
    const face = fallbackFaces[Math.floor(Math.random() * fallbackFaces.length)];
    if (face === previous) continue;
    previous = face;
    moves.push(`${face}${suffixes[Math.floor(Math.random() * suffixes.length)]}`);
  }

  return moves.join(" ");
}
