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
const wideSuffixes = ["", "'", "2"];
const megaminxTurns = ["R++", "R--"];
const megaminxDownTurns = ["D++", "D--"];
const pyraminxFaces = ["R", "L", "U", "B"];
const pyraminxTips = ["r", "l", "u", "b"];
const skewbFaces = ["R", "L", "U", "B"];

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
  if (puzzle === "Clock") return fallbackClockScramble();
  if (puzzle === "Megaminx") return fallbackMegaminxScramble();
  if (puzzle === "Pyraminx") return fallbackPyraminxScramble();
  if (puzzle === "Skewb") return fallbackSkewbScramble();
  if (puzzle === "Square-1") return fallbackSquare1Scramble();

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
  const faces =
    puzzle === "4x4" || puzzle === "4x4 BLD"
      ? [...fallbackFaces, "Rw", "Uw", "Fw"]
      : puzzle === "5x5" || puzzle === "5x5 BLD"
        ? [...fallbackFaces, "Rw", "Uw", "Fw", "Lw", "Dw", "Bw"]
        : puzzle === "6x6" || puzzle === "7x7"
          ? [
              ...fallbackFaces,
              "Rw",
              "Uw",
              "Fw",
              "Lw",
              "Dw",
              "Bw",
              "3Rw",
              "3Uw",
              "3Fw",
            ]
          : fallbackFaces;
  const moves: string[] = [];
  let previous = "";

  while (moves.length < length) {
    const face = faces[Math.floor(Math.random() * faces.length)];
    if (face === previous) continue;
    previous = face;
    moves.push(`${face}${suffixes[Math.floor(Math.random() * suffixes.length)]}`);
  }

  return moves.join(" ");
}

function fallbackMegaminxScramble() {
  const lines = Array.from({ length: 7 }, () => {
    const pairs = Array.from({ length: 5 }, () => {
      const r = megaminxTurns[Math.floor(Math.random() * megaminxTurns.length)];
      const d =
        megaminxDownTurns[Math.floor(Math.random() * megaminxDownTurns.length)];
      return `${r} ${d}`;
    });
    return `${pairs.join(" ")} U${Math.random() > 0.5 ? "'" : ""}`;
  });

  return lines.join("\n");
}

function fallbackPyraminxScramble() {
  const moves = randomMoves(pyraminxFaces, 8);
  const tips = pyraminxTips
    .filter(() => Math.random() > 0.35)
    .map((tip) => `${tip}${Math.random() > 0.5 ? "'" : ""}`);

  return [...moves, ...tips].join(" ");
}

function fallbackSkewbScramble() {
  return randomMoves(skewbFaces, 11).join(" ");
}

function fallbackSquare1Scramble() {
  const turns = Array.from({ length: 12 }, () => {
    const top = randomSquare1Turn();
    const bottom = randomSquare1Turn();
    return `(${top}, ${bottom}) /`;
  });

  return turns.join(" ");
}

function fallbackClockScramble() {
  const pins = ["UR", "DR", "DL", "UL"];
  const dials = ["U", "R", "D", "L", "ALL", ...pins];
  const firstSide = dials.map((dial) => `${dial}${randomClockTurn()}`);
  const secondSide = ["y2", ...dials.map((dial) => `${dial}${randomClockTurn()}`)];
  const pinState = pins.map((pin) => `${pin}${Math.random() > 0.5 ? "1" : "0"}`);

  return [...firstSide, ...secondSide, ...pinState].join(" ");
}

function randomMoves(faces: string[], length: number) {
  const moves: string[] = [];
  let previous = "";

  while (moves.length < length) {
    const face = faces[Math.floor(Math.random() * faces.length)];
    if (face === previous) continue;
    previous = face;
    moves.push(`${face}${wideSuffixes[Math.floor(Math.random() * wideSuffixes.length)]}`);
  }

  return moves;
}

function randomSquare1Turn() {
  return Math.floor(Math.random() * 12) - 5;
}

function randomClockTurn() {
  const amount = Math.floor(Math.random() * 6) + 1;
  return `${amount}${Math.random() > 0.5 ? "+" : "-"}`;
}
