import { apiRequest } from "../../lib/api/client";

export type Mode = "direct" | "rythme";
export type Phase = "pret" | "jeu" | "attente" | "validation" | "fini";
export type Status =
  | "a-toi"
  | "attente"
  | "a-valider"
  | "attente-validation"
  | "fini";

export const MODES: { id: Mode; label: string; hint: string }[] = [
  {
    id: "direct",
    label: "En direct ⚡",
    hint: "Ensemble, la même lettre au même moment. Le premier qui a tout rempli crie « Stop ! » : l'autre a 10 secondes.",
  },
  {
    id: "rythme",
    label: "À son rythme 🕰️",
    hint: "Chacun joue quand il veut, 3 minutes chrono. Les réponses se comparent quand vous avez joué tous les deux.",
  },
];

/** The classic sheet, ticked at first. */
export const DEFAULT_CATEGORIES = [
  "Prénom",
  "Pays",
  "Ville",
  "Animal",
  "Fruit ou légume",
  "Métier",
  "Objet",
  "Célébrité",
];

/** More to tick, besides one's own. */
export const SUGGESTED_CATEGORIES = [
  "Marque",
  "Couleur",
  "Sport",
  "Film ou série",
  "Chanteur ou chanteuse",
  "Plat",
  "Vêtement",
  "Instrument",
  "Partie du corps",
  "Fleur ou plante",
  "Personnage de dessin animé",
  "Ce qu'on trouve dans une cuisine",
  "Mot doux",
  "Excuse pour être en retard",
  "Destination de rêve",
  "Truc qui fait peur",
  "Un souvenir à nous",
  "Un cadeau pour l'autre",
  "Une activité à deux",
  "Ce que j'aime chez toi",
];

export const MIN_CATEGORIES = 3;
export const MAX_CATEGORIES = 12;
export const MAX_CATEGORY_LENGTH = 40;

/** A round as I see it; the server only tells what I may know (see PetitBacDtos.RoundDto). */
export interface Round {
  number: number;
  letter: string | null;
  phase: Phase;
  deadline: string | null;
  meReady: boolean;
  themReady: boolean;
  themStarted: boolean;
  themFilled: number;
  stoppedByMe: boolean;
  stoppedByThem: boolean;
  mine: string[];
  theirs: string[] | null;
  mineOnLetter: boolean[] | null;
  theirsOnLetter: boolean[] | null;
  iRefused: number[];
  theyRefused: number[] | null;
  meValidated: boolean;
  themValidated: boolean;
  myPoints: number[] | null;
  theirPoints: number[] | null;
  myScore: number | null;
  theirScore: number | null;
}

export interface Game {
  id: number;
  mode: Mode;
  categories: string[];
  mine: boolean;
  ownerName: string;
  themName: string;
  myTotal: number;
  theirTotal: number;
  /** The server's clock when it answered: the timers count from it. */
  now: string;
  rounds: Round[];
  createdAt: string;
  updatedAt: string;
}

export interface Summary {
  id: number;
  mode: Mode;
  categories: number;
  mine: boolean;
  themName: string;
  rounds: number;
  myTotal: number;
  theirTotal: number;
  status: Status;
  updatedAt: string;
}

/** What /topic/petit-bac says: that game changed. */
export interface Ping {
  gameId: number;
  by: number | null;
}

const BASE = "/api/petit-bac";

export const listGames = () => apiRequest<Summary[]>(BASE);
export const getGame = (id: number) => apiRequest<Game>(`${BASE}/${id}`);
export const createGame = (mode: Mode, categories: string[]) =>
  apiRequest<Game>(BASE, { method: "POST", body: { mode, categories } });
export const nextRound = (id: number) =>
  apiRequest<Game>(`${BASE}/${id}/rounds`, { method: "POST" });
export const ready = (id: number, n: number) =>
  apiRequest<Game>(`${BASE}/${id}/rounds/${n}/ready`, { method: "POST" });
export const saveAnswers = (id: number, n: number, answers: string[]) =>
  apiRequest<Game>(`${BASE}/${id}/rounds/${n}/answers`, {
    method: "PUT",
    body: { answers },
  });
export const handIn = (id: number, n: number, answers: string[] | null) =>
  apiRequest<Game>(`${BASE}/${id}/rounds/${n}/done`, {
    method: "POST",
    body: answers ? { answers } : {},
  });
export const review = (
  id: number,
  n: number,
  refused: number[],
  validate: boolean,
) =>
  apiRequest<Game>(`${BASE}/${id}/rounds/${n}/review`, {
    method: "PUT",
    body: { refused, validate },
  });
export const deleteGame = (id: number) =>
  apiRequest<void>(`${BASE}/${id}`, { method: "DELETE" });

// Same tiny bus as the other games: the app-wide socket re-emits /topic/petit-bac to the open game.
const EVENT = "memocat:petit-bac";

export function emitPetitBac(p: Ping): void {
  window.dispatchEvent(new CustomEvent<Ping>(EVENT, { detail: p }));
}

export function onPetitBac(listener: (p: Ping) => void): () => void {
  const handler = (e: Event) => listener((e as CustomEvent<Ping>).detail);
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
}
