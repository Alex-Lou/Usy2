import { LENGTHS, SIZE, type NavalTheme, type Shot } from "./api";
import { STYLES, type Style } from "./fleet";

/** 🤖 The solo opponent, all in the browser: three levels, and a memory of your habits. */
export type Level = "mousse" | "capitaine" | "amiral";

export const LEVELS: { id: Level; label: string; emoji: string; blurb: string }[] = [
  { id: "mousse", label: "Moussaillon", emoji: "🐣", blurb: "Tire un peu au hasard, mais achève ce qu'il touche." },
  { id: "capitaine", label: "Capitaine", emoji: "🧭", blurb: "Quadrille la mer et chasse méthodiquement." },
  { id: "amiral", label: "Amiral", emoji: "🎖️", blurb: "Calcule les probabilités et retient tes habitudes." },
];

/** What the AI knows of your sea, exactly as a player would: its shots and the ships it sank. */
export interface Knowledge {
  shots: Shot[];
  sunk: number[][]; // cells of each ship already sunk
}

const DIRS = [-1, 1, -SIZE, SIZE];
const neighbour = (c: number, d: number) => {
  if (Math.abs(d) === 1 && Math.floor((c + d) / SIZE) !== Math.floor(c / SIZE)) return -1;
  const n = c + d;
  return n >= 0 && n < SIZE * SIZE ? n : -1;
};
const any = <T,>(xs: T[], rnd: () => number) => xs[Math.floor(rnd() * xs.length)];

/** Where the AI fires next. {@code habits} is how often each cell held one of your ships before. */
export function aiShot(level: Level, k: Knowledge, rnd: () => number = Math.random, habits?: number[]): number {
  const shot = new Map(k.shots.map((s) => [s.cell, s.hit]));
  const sunkCells = new Set(k.sunk.flat());
  const open = Array.from({ length: SIZE * SIZE }, (_, c) => c).filter((c) => !shot.has(c));
  const wounded = k.shots.filter((s) => s.hit && !sunkCells.has(s.cell)).map((s) => s.cell);
  const left = leftLengths(k.sunk);

  if (level === "amiral") return density(open, shot, sunkCells, wounded, left, rnd, habits);

  if (wounded.length) {
    const hurt = new Set(wounded);
    // Two hits side by side: follow their line to either end.
    const ends: number[] = [];
    for (const h of wounded) {
      for (const d of DIRS) {
        if (!hurt.has(neighbour(h, d))) continue;
        let e = h;
        while (hurt.has(neighbour(e, -d))) e = neighbour(e, -d);
        const beyond = neighbour(e, -d);
        if (beyond >= 0 && !shot.has(beyond)) ends.push(beyond);
      }
    }
    const around = wounded.flatMap((h) => DIRS.map((d) => neighbour(h, d))).filter((c) => c >= 0 && !shot.has(c));
    // The ship-boy loses the thread now and then; the captain never does.
    if (level === "capitaine" && ends.length) return any(ends, rnd);
    if (around.length && (level === "capitaine" || rnd() > 0.2)) return any(around, rnd);
  }

  if (level === "capitaine" && rnd() > 0.1) {
    // A checkerboard as wide as the smallest ship still afloat.
    const step = Math.min(...left);
    const diag = (c: number) => Math.floor(c / SIZE) + (c % SIZE);
    const phase = k.shots.length ? diag(k.shots[0].cell) % step : Math.floor(rnd() * step);
    const grid = open.filter((c) => diag(c) % step === phase);
    if (grid.length) return any(grid, rnd);
  }
  return any(open, rnd);
}

/** Every way the ships still afloat could lie; the cell under the most of them is the best bet. */
function density(open: number[], shot: Map<number, boolean>, sunkCells: Set<number>, wounded: number[], left: number[], rnd: () => number, habits?: number[]): number {
  const hurt = new Set(wounded);
  const score = new Array<number>(SIZE * SIZE).fill(0);
  for (const len of left) {
    for (let cell = 0; cell < SIZE * SIZE; cell++) {
      for (const vertical of [false, true]) {
        const row = Math.floor(cell / SIZE);
        const col = cell % SIZE;
        if ((vertical ? row : col) + len > SIZE) continue;
        const cells = Array.from({ length: len }, (_, i) => (vertical ? cell + i * SIZE : cell + i));
        if (cells.some((c) => shot.get(c) === false || sunkCells.has(c))) continue;
        const hits = cells.filter((c) => hurt.has(c)).length;
        if (wounded.length && !hits) continue;
        const w = hits ? 8 ** hits : 1;
        for (const c of cells) if (!shot.has(c)) score[c] += w;
      }
    }
  }
  const peak = Math.max(...habits ?? [0]);
  const bet = (c: number) => score[c] * (!wounded.length && habits && peak > 0 ? 1 + habits[c] / peak : 1);
  const best = Math.max(...open.map(bet));
  // Among the near-best cells, any: the admiral stays hard to read.
  return any(open.filter((c) => bet(c) >= best * 0.9), rnd);
}

function leftLengths(sunk: number[][]): number[] {
  const left = [...LENGTHS];
  for (const s of sunk) left.splice(left.indexOf(s.length), 1);
  return left.length ? left : [2];
}

/** The solo memory kept on this device: scores per level, your habits, the AI's last style. */
export interface Memory {
  level: Level;
  theme: NavalTheme;
  wins: Record<Level, { me: number; ai: number }>;
  fleetHeat: number[]; // where your ships sat, fading game after game
  shotHeat: number[]; // where you open fire
  lastStyle: Style | null;
}

const KEY = "memocat.naval.solo";
const zero = () => new Array<number>(SIZE * SIZE).fill(0);

export function loadMemory(): Memory {
  const fresh: Memory = {
    level: "capitaine",
    theme: "ocean",
    wins: { mousse: { me: 0, ai: 0 }, capitaine: { me: 0, ai: 0 }, amiral: { me: 0, ai: 0 } },
    fleetHeat: zero(),
    shotHeat: zero(),
    lastStyle: null,
  };
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? "null") as Partial<Memory> | null;
    if (!saved) return fresh;
    return {
      ...fresh,
      ...saved,
      wins: { ...fresh.wins, ...saved.wins },
      fleetHeat: saved.fleetHeat?.length === SIZE * SIZE ? saved.fleetHeat : fresh.fleetHeat,
      shotHeat: saved.shotHeat?.length === SIZE * SIZE ? saved.shotHeat : fresh.shotHeat,
    };
  } catch {
    return fresh;
  }
}

export function saveMemory(m: Memory): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(m));
  } catch {
    // Private window or full storage: the AI just forgets.
  }
}

/** After a game: older habits fade, this game's fleet and first shots count. */
export function learn(m: Memory, myFleet: number[], myShots: Shot[]): Memory {
  const fade = (h: number[]) => h.map((x) => x * 0.8);
  const fleetHeat = fade(m.fleetHeat);
  for (const c of myFleet) fleetHeat[c] += 1;
  const shotHeat = fade(m.shotHeat);
  for (const s of myShots.slice(0, 15)) shotHeat[s.cell] += 1;
  return { ...m, fleetHeat, shotHeat };
}

/** A new placement style each game, never the same twice in a row. */
export function nextStyle(last: Style | null, rnd: () => number = Math.random): Style {
  return any(STYLES.filter((s) => s !== last), rnd);
}
