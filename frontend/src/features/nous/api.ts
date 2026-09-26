import { apiRequest } from "../../lib/api/client";

/** {@code c}: choices (several can be ticked) · {@code l}: own words (both answered, then guessed) · {@code p}: just to talk. */
export type Kind = "c" | "l" | "p";
/** {@code some}: ticked choices only, under half of the ticks in common. */
export type Verdict = "right" | "close" | "some" | "wrong";

export interface NousTheme {
  id: string;
  label: string;
  emoji: string;
  color: string;
  total: number;
  guessable: number;
}

export interface NousCard {
  id: string;
  theme: string;
  kind: Kind;
  text: string;
  options: string[];
  fav: boolean;
  talked: boolean;
  answered: boolean;
}

export interface NousScore {
  right: number;
  close: number;
  some: number;
  wrong: number;
  pending: number;
  percent: number | null;
}

export interface NousOverview {
  partnerName: string | null;
  themes: NousTheme[];
  answerable: number;
  myAnswers: number;
  theirAnswers: number;
  toGuess: number;
  toJudge: number;
  /** How well I know the other one / how well they know me ({@code percent}: average points). */
  me: NousScore;
  them: NousScore;
  daily: NousCard | null;
}

export interface NousMine {
  id: string;
  theme: string;
  kind: Kind;
  text: string;
  options: string[];
  /** The options I ticked. */
  choices: number[] | null;
  answer: string | null;
}

export interface NousToGuess {
  id: string;
  theme: string;
  kind: Kind;
  text: string;
  options: string[];
}

export interface NousReveal {
  guessId: number;
  id: string;
  theme: string;
  kind: Kind;
  text: string;
  options: string[];
  guessChoices: number[] | null;
  guessText: string | null;
  answerChoices: number[] | null;
  answerText: string | null;
  verdict: Verdict | null;
  note: string | null;
  createdAt: string;
  /** 0–100: ticks in common ÷ ticks in all ({@code common}, {@code union}); words: right 100, close 50, wrong 0. */
  points: number | null;
  common: number | null;
  union: number | null;
}

export interface NousHistory {
  mine: NousReveal[];
  theirs: NousReveal[];
}

export const MAX_TEXT = 280;
export const MAX_NOTE = 140;

export const getNous = () => apiRequest<NousOverview>("/api/nous");
export const getCards = (theme?: string) => apiRequest<NousCard[]>(`/api/nous/cards${theme ? `?theme=${encodeURIComponent(theme)}` : ""}`);
export const markCard = (id: string, kind: "fav" | "talked", on: boolean) => apiRequest<void>("/api/nous/marks", { method: "PUT", body: { id, kind, on } });
export const getMine = () => apiRequest<NousMine[]>("/api/nous/me");
export const saveMine = (id: string, choices: number[] | null, text: string | null) => apiRequest<void>("/api/nous/me", { method: "PUT", body: { id, choices, text } });
export const forgetMine = (id: string) => apiRequest<void>(`/api/nous/me/${encodeURIComponent(id)}`, { method: "DELETE" });
export const getToGuess = () => apiRequest<NousToGuess[]>("/api/nous/guess");
export const sendGuess = (id: string, choices: number[] | null, text: string | null) => apiRequest<NousReveal>("/api/nous/guess", { method: "POST", body: { id, choices, text } });
export const getHistory = () => apiRequest<NousHistory>("/api/nous/history");
export const judgeGuess = (guessId: number, verdict: Verdict, note: string | null) => apiRequest<NousReveal>(`/api/nous/judge/${guessId}`, { method: "POST", body: { verdict, note } });

/** Ticked options, in their order (toggling one in or out). */
export function toggled(list: number[], i: number): number[] {
  return list.includes(i) ? list.filter((x) => x !== i) : [...list, i].sort((a, b) => a - b);
}

export const VERDICTS: Record<Verdict, { label: string; emoji: string; color: string }> = {
  right: { label: "Juste !", emoji: "🎯", color: "#3fbf7f" },
  close: { label: "Presque !", emoji: "😏", color: "#f0a020" },
  some: { label: "Un peu", emoji: "🤏", color: "#8a7bd8" },
  wrong: { label: "Raté", emoji: "🙈", color: "#e2534f" },
};

/** Why a guess got its points, in a few words. */
export function pointsDetail(r: NousReveal): string | null {
  if (r.points == null) return null;
  if (r.common != null && r.union != null) {
    return `${r.common} case${r.common > 1 ? "s" : ""} en commun sur ${r.union} cochée${r.union > 1 ? "s" : ""} en tout · ${r.points} %`;
  }
  return `Réponse en mots jugée ${r.verdict ? VERDICTS[r.verdict].label.toLowerCase().replace(" !", "") : ""} · ${r.points} %`;
}

/** A little word for a telepathy score, from "strangers" to "soulmates". */
export function telepathy(percent: number | null): string {
  if (percent == null) return "À découvrir";
  if (percent >= 90) return "Âmes sœurs télépathes 🔮";
  if (percent >= 75) return "Connexion Wi-Fi du cœur 📶";
  if (percent >= 55) return "Sur la même longueur d'onde 📻";
  if (percent >= 35) return "Ça capte… par moments 📡";
  return "Mystère total, et c'est charmant 🕵️";
}
