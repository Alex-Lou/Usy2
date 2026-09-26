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

export interface QuizToi {
  total: number;
  mine: number;
  partnerAnswered: number;
  partnerName: string | null;
  stars: number;
  best: number;
}

export interface QuizOverview {
  themes: QuizTheme[];
  toi: QuizToi;
}

export interface QuizQuestion {
  index: number;
  total: number;
  text: string;
  options: string[];
  seconds: number;
  /** The partner's name when guessing about them ("Toi & moi"). */
  about: string | null;
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

export interface SelfItem {
  id: string;
  text: string;
  options: string[];
  choice: number | null;
}

export const TOI = "toi";

export const getQuiz = () => apiRequest<QuizOverview>("/api/quiz");
export const startRun = (theme: string, level: number | null) => apiRequest<QuizRun>("/api/quiz/runs", { method: "POST", body: { theme, level } });
/** {@code choice} −1: the time ran out. */
export const answerRun = (id: string, choice: number) => apiRequest<QuizAnswered>(`/api/quiz/runs/${encodeURIComponent(id)}/answer`, { method: "POST", body: { choice } });
export const getSelf = () => apiRequest<SelfItem[]>("/api/quiz/me");
export const saveSelf = (id: string, choice: number) => apiRequest<void>("/api/quiz/me", { method: "PUT", body: { id, choice } });
