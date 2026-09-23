import type { User } from "../auth/api";

export interface Mood {
  userId: number;
  emoji: string;
  label: string | null;
  updatedAt: string;
}

export interface Note {
  id: number;
  author: User;
  text: string;
  createdAt: string;
}

/** The shared space at a glance (GET /api/couple). */
export interface CoupleOverview {
  togetherSince: string | null; // YYYY-MM-DD
  moods: Mood[];
  latestNotes: Note[]; // latest note of each person
}

export interface Memory {
  kind: "post" | "photo";
  id: number;
  yearsAgo: number;
  createdAt: string;
  authorName: string;
  text: string | null;
  assetId: number | null;
  albumId: number | null;
}

export interface ListItem {
  id: number;
  text: string;
  done: boolean;
  createdById: number;
  createdAt: string;
}

export interface SharedList {
  id: number;
  name: string;
  createdAt: string;
  items: ListItem[];
}

/** Broadcast on /topic/couple (see CoupleActivity.java). */
export interface CoupleActivity {
  kind: "mood" | "note" | "list" | "list-change" | "together";
  actorId: number;
  actorName: string;
  detail: string | null;
  refId: number | null;
}

export interface Page<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}
