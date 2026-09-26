import { apiRequest } from "../../lib/api/client";

/** ⚡ A live game, as the server sends it (see LiveDtos.View): never an answer before its reveal. */
export type LiveKind = "quiz" | "nous";
export type LiveStatus = "invited" | "playing" | "paused" | "done" | "cancelled";

export interface LiveQuestion {
  text: string;
  options: string[];
  multi: boolean;
}

export interface LiveRound {
  index: number;
  text: string;
  options: string[];
  correct: number;
  host: number[] | null;
  guest: number[] | null;
  hostPoints: number;
  guestPoints: number;
}

export interface LiveView {
  id: number;
  kind: LiveKind;
  label: string;
  status: LiveStatus;
  phase: "question" | "reveal";
  index: number;
  total: number;
  seconds: number;
  deadline: number | null;
  serverNow: number;
  pauseEnds: number | null;
  hostId: number;
  hostName: string;
  guestId: number;
  guestName: string;
  question: LiveQuestion | null;
  hostAnswered: boolean;
  guestAnswered: boolean;
  waiting: number[];
  hostScore: number;
  guestScore: number;
  endedReason: string | null;
  rounds: LiveRound[];
}

export const isActive = (g: LiveView) => g.status === "invited" || g.status === "playing" || g.status === "paused";

/** The game going on, else the last one; undefined if we never played live. */
export const getCurrentLive = () => apiRequest<LiveView | undefined>("/api/live/current");
export const createLive = (kind: LiveKind, theme: string | null, level: number | null) =>
  apiRequest<LiveView>("/api/live", { method: "POST", body: { kind, theme, level } });
const act = (id: number, what: string, body?: unknown) => apiRequest<LiveView>(`/api/live/${id}/${what}`, { method: "POST", body });
export const acceptLive = (id: number) => act(id, "accept");
export const declineLive = (id: number) => act(id, "decline");
export const answerLive = (id: number, choices: number[]) => act(id, "answer", { choices });
export const resumeLive = (id: number) => act(id, "resume");
export const quitLive = (id: number) => act(id, "quit");
export const nudgeLive = (id: number) => apiRequest<void>(`/api/live/${id}/nudge`, { method: "POST" });

// Same tiny bus as the feed: the app-wide socket re-emits /topic/live so the open page follows.
const EVENT = "memocat:live";

export function emitLive(g: LiveView): void {
  window.dispatchEvent(new CustomEvent<LiveView>(EVENT, { detail: g }));
}

export function onLive(listener: (g: LiveView) => void): () => void {
  const handler = (e: Event) => listener((e as CustomEvent<LiveView>).detail);
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
}
