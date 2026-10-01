import { apiRequest } from "../../lib/api/client";

export type Size = "petite" | "moyenne" | "grande";
export type Dir = "right" | "down";

/** A clue written in `cell`; its answer starts in `start` (to the right or below) for `length` cells. */
export interface Clue {
  cell: number;
  dir: Dir;
  start: number;
  length: number;
  text: string;
}

/**
 * One character per cell, row by row. solution: the letter, or # (no letter).
 * letters: the letter typed, . if empty. authors: a (who started it), b (the other), * (revealed), . (nobody).
 */
export interface Game {
  id: number;
  size: Size;
  shared: boolean;
  ownerId: number;
  ownerName: string;
  width: number;
  height: number;
  clues: Clue[];
  solution: string;
  letters: string;
  authors: string;
  createdAt: string;
  updatedAt: string;
  finishedAt: string | null;
}

export interface Summary {
  id: number;
  size: Size;
  shared: boolean;
  ownerName: string;
  mine: boolean;
  progress: number;
  createdAt: string;
  updatedAt: string;
  finishedAt: string | null;
}

export interface Change {
  cell: number;
  letter?: string;
  reveal?: boolean;
}

export interface CellChange {
  cell: number;
  letter: string;
  author: string;
}

/** What /topic/crossword says: someone typed in a shared grid. */
export interface Ping {
  gameId: number;
  shared: boolean;
  by: number;
  cells: CellChange[];
  finishedAt: string | null;
}

export function listGames(): Promise<Summary[]> {
  return apiRequest<Summary[]>("/api/crossword");
}

export function createGame(size: Size, shared: boolean): Promise<Game> {
  return apiRequest<Game>("/api/crossword", { method: "POST", body: { size, shared } });
}

export function getGame(id: number): Promise<Game> {
  return apiRequest<Game>(`/api/crossword/${id}`);
}

export function play(id: number, changes: Change[]): Promise<Ping> {
  return apiRequest<Ping>(`/api/crossword/${id}/cells`, { method: "PUT", body: { changes } });
}

export function deleteGame(id: number): Promise<void> {
  return apiRequest<void>(`/api/crossword/${id}`, { method: "DELETE" });
}

// Same tiny bus as the others: the app-wide socket re-emits /topic/crossword to the open grid.
const EVENT = "memocat:crossword";

export function emitCrossword(p: Ping): void {
  window.dispatchEvent(new CustomEvent<Ping>(EVENT, { detail: p }));
}

export function onCrossword(listener: (p: Ping) => void): () => void {
  const handler = (e: Event) => listener((e as CustomEvent<Ping>).detail);
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
}
