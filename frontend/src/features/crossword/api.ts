import { apiRequest } from "../../lib/api/client";

export type Size = "petite" | "moyenne" | "grande";
export type Theme = "melange" | "cuisine" | "nature" | "voyage" | "maison" | "culture" | "sport" | "corps" | "amour";
export type Level = "facile" | "moyen" | "difficile";

export const THEMES: { id: Theme; label: string; emoji: string }[] = [
  { id: "melange", label: "Mélange", emoji: "🎲" },
  { id: "cuisine", label: "Cuisine", emoji: "🍳" },
  { id: "nature", label: "Nature & animaux", emoji: "🌿" },
  { id: "voyage", label: "Voyage", emoji: "✈️" },
  { id: "maison", label: "Maison", emoji: "🏠" },
  { id: "culture", label: "Musique & cinéma", emoji: "🎬" },
  { id: "sport", label: "Sport", emoji: "⚽" },
  { id: "corps", label: "Corps & santé", emoji: "🩺" },
  { id: "amour", label: "Amour & nous deux", emoji: "💞" },
];

export const LEVELS: { id: Level; label: string; hint: string }[] = [
  { id: "facile", label: "Facile", hint: "mots courants, définitions directes" },
  { id: "moyen", label: "Moyen", hint: "plus de mots, quelques définitions piégeuses" },
  { id: "difficile", label: "Difficile", hint: "définitions à double sens et jeux de mots" },
];

export function themeOf(id: string | undefined): { label: string; emoji: string } {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}

export function levelLabel(id: string | undefined): string {
  return LEVELS.find((l) => l.id === id)?.label ?? "Facile";
}
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
  theme: Theme;
  level: Level;
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
  /** The grid of the day (YYYY-MM-DD), or null for one started by hand. */
  daily: string | null;
}

export interface Summary {
  id: number;
  size: Size;
  theme: Theme;
  level: Level;
  shared: boolean;
  ownerName: string;
  mine: boolean;
  progress: number;
  createdAt: string;
  updatedAt: string;
  finishedAt: string | null;
  daily: string | null;
}

/** Today's grid (gameId once one of us opened it) and the days in a row it was finished. */
export interface Daily {
  date: string;
  level: Level;
  gameId: number | null;
  progress: number;
  finished: boolean;
  streak: number;
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

export function createGame(size: Size, shared: boolean, theme: Theme, level: Level): Promise<Game> {
  return apiRequest<Game>("/api/crossword", { method: "POST", body: { size, shared, theme, level } });
}

export function getDaily(): Promise<Daily> {
  return apiRequest<Daily>("/api/crossword/daily");
}

/** Opens today's grid (made, shared, by the first of us to open it). */
export function playDaily(): Promise<Game> {
  return apiRequest<Game>("/api/crossword/daily", { method: "POST" });
}

/** Stars for a finished grid: 3 without help, 2 with a few letters revealed, 1 beyond. */
export function starsFor(revealed: number): number {
  return revealed === 0 ? 3 : revealed <= 3 ? 2 : 1;
}

export function getGame(id: number): Promise<Game> {
  return apiRequest<Game>(`/api/crossword/${id}`);
}

export function play(id: number, changes: Change[]): Promise<Ping> {
  return apiRequest<Ping>(`/api/crossword/${id}/cells`, { method: "PUT", body: { changes } });
}

/** Empties the grid (for both of us when shared); the cells cleared come back, as for a play. */
export function restartGame(id: number): Promise<Ping> {
  return apiRequest<Ping>(`/api/crossword/${id}/restart`, { method: "POST" });
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
