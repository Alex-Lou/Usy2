import type { Widget } from "../profile/types";
import type { CoupleEvent } from "./types";

/**
 * Calendar maths for "Nos dates", on local calendar days (the phone's own
 * midnight). Mirrors CoupleEvent.occursOn on the server: a yearly date comes
 * back every year from its first one, 29 February on the 28th otherwise.
 */

/** One thing on a given day: a shared event, or a countdown widget (read-only). */
export interface DateEntry {
  key: string;
  day: Date; // local midnight of this occurrence
  title: string;
  emoji: string | null;
  time: string | null; // "HH:mm"
  yearly: boolean;
  /** How many years since the first time (yearly dates), else 0. */
  years: number;
  event: CoupleEvent | null; // null = a countdown widget
}

/** A countdown widget of a profile or of the side menu. */
export interface Countdown {
  date: string; // YYYY-MM-DD[THH:mm]
  label?: string;
}

/** "YYYY-MM-DD" (optionally followed by a time) → that day at local midnight. */
export function parseDay(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function dayKey(day: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${day.getFullYear()}-${pad(day.getMonth() + 1)}-${pad(day.getDate())}`;
}

export function today(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** Whole days from `from` to `day` (both local midnights). */
export function daysBetween(from: Date, day: Date): number {
  return Math.round((day.getTime() - from.getTime()) / 86_400_000);
}

/** The anniversary of `start` in `year` (29 February → 28 February in other years). */
function inYear(start: Date, year: number): Date {
  const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  const date = start.getMonth() === 1 && start.getDate() === 29 && !leap ? 28 : start.getDate();
  return new Date(year, start.getMonth(), date);
}

export function occursOn(e: Pick<CoupleEvent, "date" | "yearly">, day: Date): boolean {
  const start = parseDay(e.date);
  if (!e.yearly) return sameDay(start, day);
  return start.getTime() <= day.getTime() && sameDay(inYear(start, day.getFullYear()), day);
}

/** The first occurrence on or after `from`, or null (a one-off date already past). */
export function nextOccurrence(e: Pick<CoupleEvent, "date" | "yearly">, from: Date): Date | null {
  const start = parseDay(e.date);
  if (start.getTime() >= from.getTime()) return start;
  if (!e.yearly) return null;
  const thisYear = inYear(start, from.getFullYear());
  return thisYear.getTime() >= from.getTime() ? thisYear : inYear(start, from.getFullYear() + 1);
}

function hhmm(time: string | null | undefined): string | null {
  return time ? time.slice(0, 5) : null;
}

function eventEntry(e: CoupleEvent, day: Date): DateEntry {
  return {
    key: `e${e.id}-${dayKey(day)}`,
    day,
    title: e.title,
    emoji: e.emoji,
    time: hhmm(e.time),
    yearly: e.yearly,
    years: e.yearly ? day.getFullYear() - parseDay(e.date).getFullYear() : 0,
    event: e,
  };
}

function countdownEntry(c: Countdown): DateEntry {
  const day = parseDay(c.date);
  return {
    key: `c${c.date}-${c.label ?? ""}`,
    day,
    title: c.label?.trim() || "Compte à rebours",
    emoji: "⏳",
    time: c.date.length > 10 ? hhmm(c.date.slice(11)) : null,
    yearly: false,
    years: 0,
    event: null,
  };
}

function byTime(a: DateEntry, b: DateEntry): number {
  return a.day.getTime() - b.day.getTime() || (a.time ?? "").localeCompare(b.time ?? "");
}

/** Every countdown widget found in these widget lists, each date+label once. */
export function countdownsFrom(lists: Widget[][]): Countdown[] {
  const seen = new Map<string, Countdown>();
  for (const w of lists.flat()) {
    if (w.type === "countdown" && /^\d{4}-\d{2}-\d{2}/.test(w.date)) {
      seen.set(`${w.date}|${w.label?.trim() ?? ""}`, { date: w.date, label: w.label });
    }
  }
  return [...seen.values()];
}

/** What falls on `day`, all-day first then by time. */
export function entriesOn(events: CoupleEvent[], countdowns: Countdown[], day: Date): DateEntry[] {
  return [
    ...events.filter((e) => occursOn(e, day)).map((e) => eventEntry(e, day)),
    ...countdowns.filter((c) => sameDay(parseDay(c.date), day)).map(countdownEntry),
  ].sort(byTime);
}

/** The next `limit` dates from `from` (included), soonest first. */
export function upcoming(events: CoupleEvent[], countdowns: Countdown[], from: Date, limit: number): DateEntry[] {
  const all: DateEntry[] = [];
  for (const e of events) {
    const day = nextOccurrence(e, from);
    if (day) all.push(eventEntry(e, day));
  }
  for (const c of countdowns) {
    if (parseDay(c.date).getTime() >= from.getTime()) all.push(countdownEntry(c));
  }
  return all.sort(byTime).slice(0, limit);
}

/** "Aujourd'hui", "Demain", "Dans 5 jours". */
export function whenLabel(day: Date, from: Date = today()): string {
  const n = daysBetween(from, day);
  if (n === 0) return "Aujourd'hui";
  if (n === 1) return "Demain";
  if (n > 1) return `Dans ${n} jours`;
  return n === -1 ? "Hier" : `Il y a ${-n} jours`;
}

/** "3 ans" for the 3rd anniversary of a yearly date. */
export function yearsLabel(entry: DateEntry): string | null {
  return entry.yearly && entry.years > 0 ? `${entry.years} an${entry.years > 1 ? "s" : ""}` : null;
}
