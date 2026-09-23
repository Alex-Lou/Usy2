/** Whole days from a YYYY-MM-DD date to today (local calendar days). */
export function daysSince(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  const start = new Date(y, m - 1, d);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((today.getTime() - start.getTime()) / 86_400_000);
}

/** "à l'instant", "il y a 5 min", "il y a 3 h", "hier", "le 12/09". */
export function ago(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `il y a ${h} h`;
  if (h < 48) return "hier";
  return `le ${new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })}`;
}
