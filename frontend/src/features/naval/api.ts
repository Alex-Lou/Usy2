import { apiRequest } from "../../lib/api/client";

/** 🚢 Battleship, as the server sends it (see NavalDtos): the other's ships only once sunk. */
export type NavalTheme = "ocean" | "cartoon" | "pirate" | "space";
export type NavalStatus = "placing" | "playing" | "done";

export const SIZE = 10;
export const LENGTHS = [5, 4, 3, 3, 2];

export interface ShipView {
  type: number;
  cells: number[];
  sunk: boolean;
}

export interface Shot {
  cell: number;
  hit: boolean;
}

export interface LastShot {
  by: number;
  cell: number;
  hit: boolean;
  sunk: number | null;
}

export interface NavalView {
  id: number;
  theme: NavalTheme;
  nextTheme: NavalTheme;
  status: NavalStatus;
  hostId: number;
  hostName: string;
  guestId: number;
  guestName: string;
  meId: number;
  turnId: number | null;
  winnerId: number | null;
  endedReason: "sunk" | "abandon" | null;
  mePlaced: boolean;
  themPlaced: boolean;
  myFleet: ShipView[];
  theirShips: ShipView[];
  myShots: Shot[];
  theirShots: Shot[];
  shots: number;
  last: LastShot | null;
  myWins: number;
  theirWins: number;
}

/** What /topic/naval says: a game changed (never where the ships are). */
export interface NavalPing {
  id: number;
  status: NavalStatus;
  turnId: number | null;
  winnerId: number | null;
  hostId: number;
  hostName: string;
  guestId: number;
  guestName: string;
  shots: number;
  hit: boolean;
}

/** A ship to place: first (top-left) cell and direction. */
export interface Placement {
  cell: number;
  vertical: boolean;
}

export const getNaval = () => apiRequest<NavalView | undefined>("/api/naval/current");
export const createNaval = (theme: NavalTheme) => apiRequest<NavalView>("/api/naval", { method: "POST", body: { theme } });
export const placeFleet = (id: number, ships: Placement[]) => apiRequest<NavalView>(`/api/naval/${id}/fleet`, { method: "POST", body: { ships } });
export const shoot = (id: number, cell: number) => apiRequest<NavalView>(`/api/naval/${id}/shoot`, { method: "POST", body: { cell } });
export const quitNaval = (id: number) => apiRequest<NavalView>(`/api/naval/${id}/quit`, { method: "POST" });
export const chooseTheme = (id: number, theme: NavalTheme) => apiRequest<NavalView>(`/api/naval/${id}/theme`, { method: "POST", body: { theme } });

/** The cells a ship covers, or null if it leaves the sea. */
export function cellsOf(p: Placement, length: number): number[] | null {
  const row = Math.floor(p.cell / SIZE);
  const col = p.cell % SIZE;
  if ((p.vertical ? row : col) + length > SIZE) return null;
  return Array.from({ length }, (_, k) => (p.vertical ? p.cell + k * SIZE : p.cell + k));
}

// Same tiny bus as the others: the app-wide socket re-emits /topic/naval so the open page re-fetches.
const EVENT = "memocat:naval";

export function emitNaval(p: NavalPing): void {
  window.dispatchEvent(new CustomEvent<NavalPing>(EVENT, { detail: p }));
}

export function onNaval(listener: (p: NavalPing) => void): () => void {
  const handler = (e: Event) => listener((e as CustomEvent<NavalPing>).detail);
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
}
