/**
 * Sudoku: a random full grid, then clues taken away one by one as long as the
 * puzzle keeps exactly one solution. Cells are 0..80 (row * 9 + col), 0 = empty.
 */

export type Level = "facile" | "moyen" | "difficile" | "expert";

export const LEVELS: { id: Level; label: string; clues: number }[] = [
  { id: "facile", label: "Facile", clues: 40 },
  { id: "moyen", label: "Moyen", clues: 33 },
  { id: "difficile", label: "Difficile", clues: 28 },
  { id: "expert", label: "Expert", clues: 24 },
];

export interface Puzzle {
  puzzle: number[];
  solution: number[];
}

export const rowOf = (i: number) => Math.floor(i / 9);
export const colOf = (i: number) => i % 9;
export const boxOf = (i: number) => Math.floor(rowOf(i) / 3) * 3 + Math.floor(colOf(i) / 3);

/** The 20 cells sharing a row, a column or a box with each cell. */
export const PEERS: number[][] = Array.from({ length: 81 }, (_, i) =>
  Array.from({ length: 81 }, (_, j) => j).filter(
    (j) => j !== i && (rowOf(j) === rowOf(i) || colOf(j) === colOf(i) || boxOf(j) === boxOf(i)),
  ),
);

function shuffled<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function candidates(grid: number[], i: number): number[] {
  const used = new Set(PEERS[i].map((j) => grid[j]));
  return [1, 2, 3, 4, 5, 6, 7, 8, 9].filter((d) => !used.has(d));
}

/** The empty cell with the fewest candidates (-1 when the grid is full). */
function mostConstrained(grid: number[]): { cell: number; options: number[] } {
  let best = { cell: -1, options: [] as number[] };
  for (let i = 0; i < 81; i++) {
    if (grid[i] !== 0) continue;
    const options = candidates(grid, i);
    if (best.cell === -1 || options.length < best.options.length) best = { cell: i, options };
    if (options.length <= 1) break;
  }
  return best;
}

/** Counts solutions, stopping at `limit` (2 is enough to know it isn't unique). */
export function countSolutions(grid: number[], limit = 2): number {
  const g = [...grid];
  let count = 0;
  const walk = (): boolean => {
    const { cell, options } = mostConstrained(g);
    if (cell === -1) return ++count >= limit;
    for (const d of options) {
      g[cell] = d;
      if (walk()) return true;
    }
    g[cell] = 0;
    return false;
  };
  walk();
  return count;
}

function fullGrid(): number[] {
  const g = new Array<number>(81).fill(0);
  const walk = (): boolean => {
    const { cell, options } = mostConstrained(g);
    if (cell === -1) return true;
    for (const d of shuffled(options)) {
      g[cell] = d;
      if (walk()) return true;
    }
    g[cell] = 0;
    return false;
  };
  walk();
  return g;
}

export function generate(level: Level): Puzzle {
  const target = LEVELS.find((l) => l.id === level)!.clues;
  const solution = fullGrid();
  const puzzle = [...solution];
  let clues = 81;
  for (const i of shuffled(Array.from({ length: 81 }, (_, k) => k))) {
    if (clues <= target) break;
    const kept = puzzle[i];
    puzzle[i] = 0;
    if (countSolutions(puzzle) !== 1) puzzle[i] = kept;
    else clues--;
  }
  return { puzzle, solution };
}

/** Cells whose value clashes with another in its row, column or box. */
export function conflicts(grid: number[]): Set<number> {
  const bad = new Set<number>();
  for (let i = 0; i < 81; i++) {
    if (grid[i] !== 0 && PEERS[i].some((j) => grid[j] === grid[i])) bad.add(i);
  }
  return bad;
}
