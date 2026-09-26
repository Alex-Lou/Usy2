import { cellsOf, LENGTHS, SIZE, type Placement } from "./api";

/** A fleet being placed: one slot per ship type, null while it waits in the port. */
export type Fleet = (Placement | null)[];

/** How a fleet likes to sit: all over, along the edges, far apart, or huddled. */
export type Style = "random" | "edges" | "spread" | "cluster";
export const STYLES: Style[] = ["random", "edges", "spread", "cluster"];

export const emptyFleet = (): Fleet => LENGTHS.map(() => null);

/** Every cell the fleet covers, the ship {@code except} left out. */
export function taken(fleet: Fleet, except = -1): Set<number> {
  return new Set(fleet.flatMap((p, i) => (p && i !== except ? cellsOf(p, LENGTHS[i]) ?? [] : [])));
}

/** The ship's cells at {@code p}, or null if it leaves the sea or lies on another ship. */
export function fits(fleet: Fleet, type: number, p: Placement): number[] | null {
  const cells = cellsOf(p, LENGTHS[type]);
  if (!cells) return null;
  const busy = taken(fleet, type);
  return cells.some((c) => busy.has(c)) ? null : cells;
}

/** The start cell for a ship whose k-th cell sits on (row, col), kept inside the sea. */
export function startAt(type: number, vertical: boolean, row: number, col: number, k: number): Placement {
  const len = LENGTHS[type];
  const r = clamp(vertical ? row - k : row, 0, SIZE - (vertical ? len : 1));
  const c = clamp(vertical ? col : col - k, 0, SIZE - (vertical ? 1 : len));
  return { cell: r * SIZE + c, vertical };
}

/**
 * The ship turned a quarter around its middle, slid back into the sea and,
 * if another ship is in the way, along its new line to the nearest free spot.
 * Null when there is no room at all.
 */
export function turned(fleet: Fleet, type: number): Placement | null {
  const p = fleet[type];
  if (!p) return null;
  const len = LENGTHS[type];
  const mid = Math.floor((len - 1) / 2);
  const row = Math.floor(p.cell / SIZE) + (p.vertical ? mid : 0);
  const col = (p.cell % SIZE) + (p.vertical ? 0 : mid);
  const v = !p.vertical;
  for (let d = 0; d < SIZE; d++) {
    for (const s of d === 0 ? [0] : [d, -d]) {
      const q = startAt(type, v, v ? row + s : row, v ? col : col + s, mid);
      if (fits(fleet, type, q)) return q;
    }
  }
  return null;
}

/** A whole fleet laid out at random in the given style (never fails). */
export function randomFleet(style: Style = "random", rnd: () => number = Math.random, avoid?: number[]): Placement[] {
  for (;;) {
    const fleet = emptyFleet();
    let ok = true;
    for (let type = 0; type < LENGTHS.length && ok; type++) {
      const options: { p: Placement; w: number }[] = [];
      for (let cell = 0; cell < SIZE * SIZE; cell++) {
        for (const vertical of [false, true]) {
          const p = { cell, vertical };
          const cells = fits(fleet, type, p);
          if (cells) options.push({ p, w: weight(style, cells, taken(fleet), avoid) });
        }
      }
      const pick = pickWeighted(options, rnd);
      if (pick) fleet[type] = pick;
      else ok = false;
    }
    if (ok) return fleet as Placement[];
  }
}

function weight(style: Style, cells: number[], busy: Set<number>, avoid?: number[]): number {
  const rows = cells.map((c) => Math.floor(c / SIZE));
  const cols = cells.map((c) => c % SIZE);
  let w = 1;
  if (style === "edges") {
    const onEdge = cells.filter((_, i) => rows[i] === 0 || rows[i] === SIZE - 1 || cols[i] === 0 || cols[i] === SIZE - 1).length;
    w = 1 + (8 * onEdge) / cells.length;
  } else if (busy.size > 0 && (style === "spread" || style === "cluster")) {
    let near = SIZE * 2;
    for (const c of cells) {
      for (const b of busy) near = Math.min(near, Math.abs(Math.floor(c / SIZE) - Math.floor(b / SIZE)) + Math.abs((c % SIZE) - (b % SIZE)));
    }
    w = style === "spread" ? (near <= 1 ? 0.05 : near * near) : near <= 1 ? 12 : near === 2 ? 4 : 1 / near;
  }
  // Keep away from where the other likes to shoot first.
  if (avoid) w /= 1 + cells.reduce((s, c) => s + avoid[c], 0) / cells.length;
  return w;
}

export function pickWeighted<T>(options: { p: T; w: number }[], rnd: () => number): T | null {
  const total = options.reduce((s, o) => s + o.w, 0);
  if (!options.length || total <= 0) return null;
  let x = rnd() * total;
  for (const o of options) {
    x -= o.w;
    if (x <= 0) return o.p;
  }
  return options[options.length - 1].p;
}

const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));
