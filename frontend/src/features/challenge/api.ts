import { apiRequest } from "../../lib/api/client";
import type { Page } from "../albums/types";

export interface ChallengeEntry {
  id: number;
  authorId: number;
  authorName: string;
  assetId: number;
  caption: string | null;
  createdAt: string;
}

export interface ChallengeWeek {
  weekStart: string; // Monday, YYYY-MM-DD
  theme: string;
  themeBy: string | null; // who used a joker, null: the app's theme
  jokerAvailable: boolean;
  mine: ChallengeEntry | null;
  theirsPosted: boolean;
  theirs: ChallengeEntry | null; // null until mine is posted
}

export interface PastWeek {
  weekStart: string;
  theme: string;
  entries: ChallengeEntry[];
}

export function getChallenge(): Promise<ChallengeWeek> {
  return apiRequest<ChallengeWeek>("/api/challenge");
}

export function postEntry(assetId: number, caption: string | null): Promise<ChallengeWeek> {
  return apiRequest<ChallengeWeek>("/api/challenge/entry", { method: "POST", body: { assetId, caption } });
}

export function playJoker(theme: string): Promise<ChallengeWeek> {
  return apiRequest<ChallengeWeek>("/api/challenge/joker", { method: "POST", body: { theme } });
}

export function getHistory(page: number): Promise<Page<PastWeek>> {
  return apiRequest<Page<PastWeek>>(`/api/challenge/history?page=${page}`);
}
