import { apiRequest } from "../../lib/api/client";

/** {@code c}: a choice · {@code l}: own words (both answered, then guessed) · {@code p}: just to talk. */
export type Kind = "c" | "l" | "p";
export type Verdict = "right" | "close" | "wrong";

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
  /** How well I know the other one / how well they know me. */
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
  choice: number | null;
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
  guessChoice: number | null;
  guessText: string | null;
  answerChoice: number | null;
  answerText: string | null;
  verdict: Verdict | null;
  note: string | null;
  createdAt: string;
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
export const saveMine = (id: string, choice: number | null, text: string | null) => apiRequest<void>("/api/nous/me", { method: "PUT", body: { id, choice, text } });
export const forgetMine = (id: string) => apiRequest<void>(`/api/nous/me/${encodeURIComponent(id)}`, { method: "DELETE" });
export const getToGuess = () => apiRequest<NousToGuess[]>("/api/nous/guess");
export const sendGuess = (id: string, choice: number | null, text: string | null) => apiRequest<NousReveal>("/api/nous/guess", { method: "POST", body: { id, choice, text } });
export const getHistory = () => apiRequest<NousHistory>("/api/nous/history");
export const judgeGuess = (guessId: number, verdict: Verdict, note: string | null) => apiRequest<NousReveal>(`/api/nous/judge/${guessId}`, { method: "POST", body: { verdict, note } });

export const VERDICTS: Record<Verdict, { label: string; emoji: string; color: string }> = {
  right: { label: "Juste !", emoji: "🎯", color: "#3fbf7f" },
  close: { label: "Presque !", emoji: "😏", color: "#f0a020" },
  wrong: { label: "Raté", emoji: "🙈", color: "#e2534f" },
};

/** A little word for a telepathy score, from "strangers" to "soulmates". */
export function telepathy(percent: number | null): string {
  if (percent == null) return "À découvrir";
  if (percent >= 90) return "Âmes sœurs télépathes 🔮";
  if (percent >= 75) return "Connexion Wi-Fi du cœur 📶";
  if (percent >= 55) return "Sur la même longueur d'onde 📻";
  if (percent >= 35) return "Ça capte… par moments 📡";
  return "Mystère total, et c'est charmant 🕵️";
}
