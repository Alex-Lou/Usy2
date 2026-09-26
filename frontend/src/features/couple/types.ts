import type { PartStyle, Widget } from "../profile/types";
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

/** The side menu's widgets, shared by both (see SharedWidgetsService.java). */
export interface SharedWidgets {
  widgets: Widget[];
  /** Sent back when saving: a save from an older copy is refused (409). */
  version: number;
  /** Profile widgets their owners also show here (managed on the profile). */
  linked: LinkedWidget[];
}

/** The look of "Notre profil", for both: its page background and its cards. */
export interface NousTheme {
  parts?: { page?: PartStyle; cards?: PartStyle } | null;
}

export interface LinkedWidget {
  ownerId: number;
  ownerName: string;
  widget: Widget;
}

/** A date on the shared calendar (see CoupleEventService.java). */
export interface CoupleEvent {
  id: number;
  title: string;
  date: string; // YYYY-MM-DD
  time: string | null; // HH:mm[:ss], null = all day
  emoji: string | null;
  note: string | null;
  yearly: boolean;
  createdById: number;
  createdAt: string;
}

/** What is sent to create or change a date. */
export type CoupleEventInput = Pick<CoupleEvent, "title" | "date" | "time" | "emoji" | "note" | "yearly">;

/** Broadcast on /topic/couple (see CoupleActivity.java). */
export interface CoupleActivity {
  kind: "mood" | "note" | "list" | "list-change" | "together" | "widgets" | "events" | "appearance" | "thinking" | "quiz-challenge" | "quiz-done" | "nous-guess" | "nous-judged";
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
