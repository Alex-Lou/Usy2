import { apiRequest } from "../../lib/api/client";

export interface JournalEntry {
  id: number;
  day: string; // YYYY-MM-DD, the couple's day
  authorId: number;
  authorName: string;
  text: string;
  updatedAt: string;
}

export interface JournalPage {
  today: string; // YYYY-MM-DD, the couple's day
  entries: JournalEntry[]; // newest day first
}

/** A month's lines (month 1-12), or the whole year's without it. */
export function getJournal(year: number, month?: number): Promise<JournalPage> {
  return apiRequest<JournalPage>(`/api/journal?year=${year}${month ? `&month=${month}` : ""}`);
}

export function getJournalYears(): Promise<number[]> {
  return apiRequest<number[]>("/api/journal/years");
}

/** My line of today, or of `day` (yesterday); an empty text erases it (then undefined). */
export function writeLine(text: string, day?: string): Promise<JournalEntry | undefined> {
  return apiRequest<JournalEntry | undefined>("/api/journal", { method: "PUT", body: { day: day ?? null, text } });
}
