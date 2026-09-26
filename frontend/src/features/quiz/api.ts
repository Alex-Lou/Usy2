import { apiRequest } from "../../lib/api/client";

export interface QuizLevel {
  level: number;
  stars: number;
  best: number;
  unlocked: boolean;
}

export interface QuizTheme {
  id: string;
  label: string;
  emoji: string;
  color: string;
  levels: QuizLevel[];
}

export interface QuizOverview {
  themes: QuizTheme[];
}

export interface QuizQuestion {
  index: number;
  total: number;
  text: string;
  options: string[];
  seconds: number;
}

export interface QuizRun {
  id: string;
  theme: string;
  level: number;
  question: QuizQuestion;
}

export interface QuizResult {
  score: number;
  correct: number;
  total: number;
  stars: number;
  best: number;
  newBest: boolean;
  unlockedNext: boolean;
  /** The "défi" this run was, if any ({@code challengeDone}: both have now played it). */
  challengeId: number | null;
  challengeDone: boolean;
}

export interface QuizAnswered {
  correct: boolean;
  correctIndex: number;
  gained: number;
  score: number;
  streak: number;
  next: QuizQuestion | null;
  result: QuizResult | null;
}

export const MIX = "mix";

/** A "défi" as I see it: "play" (mine to play), "wait" (sent, not played back yet) or "done". */
export interface QuizChallenge {
  id: number;
  theme: string;
  label: string;
  emoji: string;
  color: string;
  level: number;
  fromName: string;
  sentByMe: boolean;
  status: "play" | "wait" | "done";
  myScore: number | null;
  theirScore: number | null;
  answered: number;
  total: number;
  outcome: "win" | "lose" | "tie" | null;
  createdAt: string;
}

export interface QuizChallenges {
  partnerName: string | null;
  wins: number;
  losses: number;
  ties: number;
  openSent: number;
  maxOpen: number;
  items: QuizChallenge[];
}

export interface DuelLine {
  text: string;
  options: string[];
  correct: number;
  mine: boolean;
  theirs: boolean;
}

export interface QuizDuel {
  challenge: QuizChallenge;
  myName: string;
  theirName: string;
  lines: DuelLine[];
}

export const getQuiz = () => apiRequest<QuizOverview>("/api/quiz");
export const startRun = (theme: string, level: number | null) => apiRequest<QuizRun>("/api/quiz/runs", { method: "POST", body: { theme, level } });
/** {@code choice} −1: the time ran out. */
export const answerRun = (id: string, choice: number) => apiRequest<QuizAnswered>(`/api/quiz/runs/${encodeURIComponent(id)}/answer`, { method: "POST", body: { choice } });
export const getChallenges = () => apiRequest<QuizChallenges>("/api/quiz/challenges");
/** Plays my side of a new duel; it is sent once I finish. {@code theme} MIX for the surprise mix. */
export const startChallenge = (theme: string, level: number | null) => apiRequest<QuizRun>("/api/quiz/challenges", { method: "POST", body: { theme, level } });
export const playChallenge = (id: number) => apiRequest<QuizRun>(`/api/quiz/challenges/${id}/play`, { method: "POST" });
export const getDuel = (id: number) => apiRequest<QuizDuel>(`/api/quiz/challenges/${id}`);
