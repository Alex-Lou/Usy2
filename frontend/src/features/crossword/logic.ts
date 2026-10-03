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

/**
 * The clues written in each clue cell (one or two), in the order they are printed: the one whose
 * word starts to the right first, then the one whose word starts below.
 */
export function cluesByCell(clues: Clue[]): Map<number, Clue[]> {
  const map = new Map<number, Clue[]>();
  for (const clue of clues) map.set(clue.cell, [...(map.get(clue.cell) ?? []), clue]);
  for (const list of map.values()) list.sort((a, b) => a.start - b.start);
  return map;
}

/**
 * How a clue's arrow goes: straight to its word (right, down), or bent when the word starts beside
 * the clue cell but runs the other way (on the first row or column).
 */
export type Arrow = "right" | "down" | "rightThenDown" | "downThenRight";

export function arrowOf(clue: Clue): Arrow {
  const besideRight = clue.start === clue.cell + 1;
  if (clue.dir === "right") return besideRight ? "right" : "downThenRight";
  return besideRight ? "rightThenDown" : "down";
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
