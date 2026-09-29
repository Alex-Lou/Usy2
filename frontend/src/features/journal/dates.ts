/** "2026-09-29" as a local date (no time zone shift). */
export function parseDay(day: string): Date {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function dayLabel(day: string): string {
  return parseDay(day).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
}

export function previousDay(day: string): string {
  const d = parseDay(day);
  d.setDate(d.getDate() - 1);
  return d.toLocaleDateString("sv-SE"); // YYYY-MM-DD
}

export function monthLabel(year: number, month: number): string {
  const s = new Date(year, month - 1, 1).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  return s.charAt(0).toUpperCase() + s.slice(1);
}
