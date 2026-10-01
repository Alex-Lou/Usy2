import type { Clue, Dir } from "./api";

export const BLOCK = "#";

/** The cells of a clue's answer, in order. */
export function cellsOf(clue: Clue, width: number): number[] {
  const step = clue.dir === "down" ? width : 1;
  return Array.from({ length: clue.length }, (_, k) => clue.start + k * step);
}

/** For each letter cell, its word across and its word down (when there is one). */
export function wordsByCell(clues: Clue[], width: number): Map<number, Partial<Record<Dir, Clue>>> {
  const map = new Map<number, Partial<Record<Dir, Clue>>>();
  for (const clue of clues) {
    for (const cell of cellsOf(clue, width)) {
      const entry = map.get(cell) ?? {};
      entry[clue.dir] = clue;
      map.set(cell, entry);
    }
  }
  return map;
}

/** The clues written in each clue cell (a cell holds at most one of each direction). */
export function cluesByCell(clues: Clue[]): Map<number, Partial<Record<Dir, Clue>>> {
  const map = new Map<number, Partial<Record<Dir, Clue>>>();
  for (const clue of clues) {
    const entry = map.get(clue.cell) ?? {};
    entry[clue.dir] = clue;
    map.set(clue.cell, entry);
  }
  return map;
}

/** Clues in reading order: across words first, then down words, by position. */
export function readingOrder(clues: Clue[]): Clue[] {
  return [...clues].sort((a, b) => (a.dir === b.dir ? a.start - b.start : a.dir === "right" ? -1 : 1));
}

/** Letter A-Z from a key (accents dropped), or null. */
export function keyToLetter(key: string): string | null {
  if (key.length !== 1) return null;
  const plain = key.normalize("NFD").replace(/\p{M}/gu, "").toUpperCase();
  return /^[A-Z]$/.test(plain) ? plain : null;
}

export function isComplete(letters: string, solution: string): boolean {
  return letters === solution;
}
